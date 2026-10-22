import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { formatApiError } from "../../lib/utils";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.content ?? data?.data ?? [];
}

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.NOTIFICATIONS.LIST);
      return normalizeList(response.data);
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to load notifications"));
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id, { rejectWithValue }) => {
    try {
      await api.put(ENDPOINTS.NOTIFICATIONS.READ(id));
      return id;
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to mark notification as read"));
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    clearNotificationsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const id = action.payload;
        const notification = state.items.find((n) => (n.id ?? n.notificationId) === id);
        if (notification) {
          notification.read = true;
          notification.isRead = true;
        }
      });
  },
});

export const { clearNotificationsError } = notificationsSlice.actions;
export default notificationsSlice.reducer;
