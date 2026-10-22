import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { formatApiError } from "../../lib/utils";

/*
 * Follow system.
 *
 * Backend contract (verified against the Spring Boot source and by calling the
 * running API):
 *   POST   /followers  body { followingId }  -> 200 { followerId, followingId }
 *   DELETE /followers  body { followingId }  -> 204
 *   GET    /followers                        -> [{ followerId, followingId }, ...] (ALL users)
 *   GET    /followers/{id}                   -> one row by its OWN primary key
 *
 * The follower side is always derived from the JWT on the server; the client
 * never sends it. GET /followers is a single global collection (there is no
 * per-user and no count endpoint), so the rows for a user are filtered on the
 * client — the same approach GET /likes and GET /bookmarks already use.
 *
 * `followerId` is passed along with `followingId` only so the store can apply
 * the optimistic update; it is NOT part of the request body.
 */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.content ?? data?.data ?? [];
}

export const relationshipKey = (followerId, followingId) => `${followerId}:${followingId}`;

export const fetchFollowers = createAsyncThunk(
  "followers/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.FOLLOWERS.LIST);
      return normalizeList(response.data)
        .filter((row) => row?.followerId != null && row?.followingId != null)
        .map((row) => ({ followerId: row.followerId, followingId: row.followingId }));
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to load followers"));
    }
  }
);

export const followUser = createAsyncThunk(
  "followers/follow",
  async ({ followerId, followingId }, { rejectWithValue }) => {
    if (followerId == null) return rejectWithValue("You must be signed in to follow someone");
    if (Number(followerId) === Number(followingId)) {
      return rejectWithValue("You can't follow yourself");
    }
    try {
      // The server validates duplicates (409) and self-follow (400).
      const response = await api.post(ENDPOINTS.FOLLOWERS.FOLLOW, { followingId });
      return {
        followerId: response.data?.followerId ?? followerId,
        followingId: response.data?.followingId ?? followingId,
      };
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to follow this user"));
    }
  }
);

export const unfollowUser = createAsyncThunk(
  "followers/unfollow",
  async ({ followerId, followingId }, { rejectWithValue }) => {
    if (followerId == null) return rejectWithValue("You must be signed in to follow someone");
    try {
      await api.delete(ENDPOINTS.FOLLOWERS.UNFOLLOW, { data: { followingId } });
      return { followerId, followingId };
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to unfollow this user"));
    }
  }
);

const initialState = {
  // [{ followerId, followingId }] — the raw GET /followers collection.
  relationships: [],
  // Keys of requests in flight, so buttons can show a pending state.
  pending: {},
  loading: false,
  error: null,
};

const followersSlice = createSlice({
  name: "followers",
  initialState,
  reducers: {
    clearFollowersError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFollowers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowers.fulfilled, (state, action) => {
        state.loading = false;
        state.relationships = action.payload;
      })
      .addCase(fetchFollowers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Follow (optimistic, rolled back if the server rejects) ─────────────
      .addCase(followUser.pending, (state, action) => {
        const { followerId, followingId } = action.meta.arg;
        const key = relationshipKey(followerId, followingId);
        state.pending[key] = true;
        const exists = state.relationships.some(
          (r) => r.followerId === followerId && r.followingId === followingId
        );
        if (!exists) state.relationships.push({ followerId, followingId });
        state.error = null;
      })
      .addCase(followUser.fulfilled, (state, action) => {
        const { followerId, followingId } = action.payload;
        delete state.pending[relationshipKey(followerId, followingId)];
        const exists = state.relationships.some(
          (r) => r.followerId === followerId && r.followingId === followingId
        );
        if (!exists) state.relationships.push({ followerId, followingId });
      })
      .addCase(followUser.rejected, (state, action) => {
        const { followerId, followingId } = action.meta.arg;
        delete state.pending[relationshipKey(followerId, followingId)];
        state.relationships = state.relationships.filter(
          (r) => !(r.followerId === followerId && r.followingId === followingId)
        );
        state.error = action.payload;
      })

      // ── Unfollow (optimistic, rolled back if the server rejects) ───────────
      .addCase(unfollowUser.pending, (state, action) => {
        const { followerId, followingId } = action.meta.arg;
        state.pending[relationshipKey(followerId, followingId)] = true;
        state.relationships = state.relationships.filter(
          (r) => !(r.followerId === followerId && r.followingId === followingId)
        );
        state.error = null;
      })
      .addCase(unfollowUser.fulfilled, (state, action) => {
        const { followerId, followingId } = action.payload;
        delete state.pending[relationshipKey(followerId, followingId)];
      })
      .addCase(unfollowUser.rejected, (state, action) => {
        const { followerId, followingId } = action.meta.arg;
        delete state.pending[relationshipKey(followerId, followingId)];
        const exists = state.relationships.some(
          (r) => r.followerId === followerId && r.followingId === followingId
        );
        if (!exists) state.relationships.push({ followerId, followingId });
        state.error = action.payload;
      });
  },
});

export const { clearFollowersError } = followersSlice.actions;
export default followersSlice.reducer;
