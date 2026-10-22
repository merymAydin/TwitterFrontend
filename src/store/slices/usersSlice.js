import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { formatApiError } from "../../lib/utils";

/*
 * Users (profiles).
 *
 * Backend contract (verified against the Spring Boot source):
 *   GET /users        -> [{ userId, username, location, bio, photo, banner, premium }, ...]  (public fields only)
 *   GET /users/{id}   -> same public shape for one user
 *   GET /users/me     -> private profile, including email, birthday and premium
 *   PUT /users/{id}   body { username, email, birthday, location, bio, photo, banner }
 *
 * TweetResponse and CommentResponse only carry a `userId` (no username/photo),
 * so tweets and comments resolve their author against the users map loaded here.
 *
 * NOTE: UserServiceImpl.update() writes EVERY field from the request body, so
 * PUT must always receive the full user — a partial body would null out the
 * omitted fields (e.g. email).
 */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.content ?? data?.data ?? [];
}

export const fetchUsers = createAsyncThunk("users/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get(ENDPOINTS.USERS.LIST);
    return normalizeList(response.data);
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to load users"));
  }
});

export const fetchUserById = createAsyncThunk("users/fetchOne", async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(ENDPOINTS.USERS.DETAIL(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to load profile"));
  }
});

export const updateUser = createAsyncThunk(
  "users/update",
  async ({ id, userData }, { rejectWithValue }) => {
    try {
      const response = await api.put(ENDPOINTS.USERS.UPDATE(id), userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to update profile"));
    }
  }
);

const initialState = {
  items: [],
  byId: {},
  byUsername: {},
  // The profile currently being viewed (GET /users/{id}).
  profile: null,
  loading: false,
  profileLoading: false,
  saving: false,
  error: null,
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUsersError: (state) => {
      state.error = null;
    },
    clearProfile: (state) => {
      state.profile = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.byId = {};
        state.byUsername = {};
        for (const user of action.payload) {
          if (user?.userId != null) state.byId[user.userId] = user;
          if (user?.username) state.byUsername[user.username] = user;
        }
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUserById.pending, (state) => {
        state.profileLoading = true;
        state.profile = null;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload;
      })
      .addCase(updateUser.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.saving = false;
        state.profile = action.payload;
        // Keep the shared maps in sync so avatars/usernames update everywhere.
        if (action.payload?.userId != null) state.byId[action.payload.userId] = action.payload;
        if (action.payload?.username) state.byUsername[action.payload.username] = action.payload;
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      });
  },
});

export const { clearUsersError, clearProfile } = usersSlice.actions;
export default usersSlice.reducer;
