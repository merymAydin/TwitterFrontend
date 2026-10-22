import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";

/*
 * Comments.
 *
 * Backend contract (verified against the Spring Boot source):
 *   GET    /comments                -> [{ commentId, userId, tweetId, content }, ...]
 *   POST   /comments  body { tweetId, content }
 *                                   -> { commentId, userId, tweetId, content }
 *   PUT    /comments/{id}, DELETE /comments/{id}
 *
 * There is no per-tweet comment endpoint, so the tweet detail page loads the
 * full collection once and filters it by tweetId.
 */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.content ?? data?.data ?? [];
}

export const fetchComments = createAsyncThunk(
  "comments/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.COMMENTS.LIST);
      return normalizeList(response.data);
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to load comments");
    }
  }
);

export const createComment = createAsyncThunk(
  "comments/create",
  async ({ tweetId, content }, { getState, rejectWithValue }) => {
    try {
      const response = await api.post(ENDPOINTS.COMMENTS.CREATE, { tweetId, content });
      // Note: CommentServiceImpl.createComment returns the *tweet owner's* id in
      // the response's userId field, while GET /comments returns the comment
      // author. The author is always the current user, so we normalize it here.
      const authorId = getState().auth.user?.userId;
      return { ...response.data, userId: authorId ?? response.data?.userId };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to post comment");
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  submitting: false,
  error: null,
};

const commentsSlice = createSlice({
  name: "comments",
  initialState,
  reducers: {
    clearCommentsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createComment.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.submitting = false;
        state.items.push(action.payload);
      })
      .addCase(createComment.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { clearCommentsError } = commentsSlice.actions;
export default commentsSlice.reducer;
