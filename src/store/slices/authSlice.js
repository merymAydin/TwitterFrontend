import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";

// Login: POST /auth/login with JSON body { email, password }.
// Response: JSON object { "token": "JWT_TOKEN" }.
export const login = createAsyncThunk("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.AUTH.LOGIN, credentials);
    const token = response.data.token;
    localStorage.setItem("token", token);
    return { token, isAuthenticated: true };
  } catch (error) {
    return rejectWithValue(error.response?.data || "Login failed");
  }
});

// Registration: POST /users
export const register = createAsyncThunk("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.USERS.REGISTER, userData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Registration failed");
  }
});

// Resolves the authenticated user's private profile from GET /users/me.
// Public user listings intentionally omit email/birthday, so the old approach
// of matching the JWT email against GET /users can no longer identify the user.
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.USERS.ME);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to load current user");
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem("token");
});

const initialState = {
  token: localStorage.getItem("token") || null,
  isAuthenticated: !!localStorage.getItem("token"),
  user: null,
  loading: false,
  error: null,
  registerSuccess: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.registerSuccess = false;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.registerSuccess = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
