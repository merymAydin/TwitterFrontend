import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";

/*
 * Likes & bookmarks.
 *
 * Backend contract (verified against the Spring Boot source):
 *   POST   /likes       body { tweetId }  -> { userId, tweetId }
 *   DELETE /likes       body { tweetId }  -> 204
 *   GET    /likes                         -> [{ userId, tweetId }, ...] (all users)
 *   POST   /bookmarks   body { tweetId }  -> { userId, tweetId }
 *   DELETE /bookmarks   body { tweetId }  -> 204
 *   GET    /bookmarks                     -> [{ userId, tweetId }, ...] (all users)
 *
 * The GET collections are global, so the current user's rows are filtered by the
 * resolved userId (state.auth.user.userId). The bookmark collection only carries
 * ids, so the Bookmarks page resolves each tweet via GET /tweet/{id}.
 *
 * Like/unlike and bookmark/unbookmark update the UI optimistically (on `pending`)
 * and roll back on `rejected`.
 */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.content ?? data?.data ?? [];
}

export const fetchMyInteractions = createAsyncThunk(
  "interactions/fetchMine",
  async (_, { getState, rejectWithValue }) => {
    const userId = getState().auth.user?.userId;
    if (userId == null) return rejectWithValue("Current user is not loaded");
    try {
      const [likesRes, bookmarksRes] = await Promise.all([
        api.get(ENDPOINTS.LIKES.LIST),
        api.get(ENDPOINTS.BOOKMARKS.LIST),
      ]);
      return {
        likedIds: normalizeList(likesRes.data)
          .filter((l) => l.userId === userId)
          .map((l) => l.tweetId),
        bookmarkedIds: normalizeList(bookmarksRes.data)
          .filter((b) => b.userId === userId)
          .map((b) => b.tweetId),
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to load your likes and bookmarks");
    }
  }
);

// Resolves the tweets the current user bookmarked (BookmarkResponse has ids only).
export const fetchBookmarkedTweets = createAsyncThunk(
  "interactions/fetchBookmarkedTweets",
  async (_, { getState, rejectWithValue }) => {
    const userId = getState().auth.user?.userId;
    if (userId == null) return rejectWithValue("Current user is not loaded");
    try {
      const res = await api.get(ENDPOINTS.BOOKMARKS.LIST);
      const ids = normalizeList(res.data)
        .filter((b) => b.userId === userId)
        .map((b) => b.tweetId);
      const tweets = await Promise.all(
        ids.map(async (id) => (await api.get(ENDPOINTS.TWEETS.DETAIL(id))).data)
      );
      return tweets;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to load bookmarked tweets");
    }
  }
);

export const likeTweet = createAsyncThunk(
  "interactions/like",
  async (tweetId, { rejectWithValue }) => {
    try {
      await api.post(ENDPOINTS.LIKES.CREATE, { tweetId });
      return tweetId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to like tweet");
    }
  }
);

export const unlikeTweet = createAsyncThunk(
  "interactions/unlike",
  async (tweetId, { rejectWithValue }) => {
    try {
      await api.delete(ENDPOINTS.LIKES.DELETE, { data: { tweetId } });
      return tweetId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to remove like");
    }
  }
);

export const bookmarkTweet = createAsyncThunk(
  "interactions/bookmark",
  async (tweetId, { rejectWithValue }) => {
    try {
      await api.post(ENDPOINTS.BOOKMARKS.CREATE, { tweetId });
      return tweetId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to bookmark tweet");
    }
  }
);

export const unbookmarkTweet = createAsyncThunk(
  "interactions/unbookmark",
  async (tweetId, { rejectWithValue }) => {
    try {
      await api.delete(ENDPOINTS.BOOKMARKS.DELETE, { data: { tweetId } });
      return tweetId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to remove bookmark");
    }
  }
);

// Retweet tracking — the backend has no per-user retweet list endpoint, so
// state is tracked client-side based on user actions (optimistic + rollback).
export const retweetTweet = createAsyncThunk(
  "interactions/retweet",
  async (tweetId, { rejectWithValue }) => {
    try {
      await api.post(ENDPOINTS.TWEETS.RETWEET(tweetId));
      return tweetId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to retweet");
    }
  }
);

export const unretweetTweet = createAsyncThunk(
  "interactions/unretweet",
  async (tweetId, { rejectWithValue }) => {
    try {
      await api.delete(ENDPOINTS.TWEETS.UNRETWEET(tweetId));
      return tweetId;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to undo retweet");
    }
  }
);

const withoutId = (list, id) => list.filter((x) => x !== id);

const initialState = {
  likedIds: [],
  bookmarkedIds: [],
  retweetedIds: [],
  // Local like-count deltas since the last server read (the tweet's
  // statistics.likes is a snapshot taken at feed-load time).
  likeDelta: {},
  retweetDelta: {},
  bookmarkedTweets: [],
  lastRemovedBookmark: null,
  loading: false,
  error: null,
};

const interactionsSlice = createSlice({
  name: "interactions",
  initialState,
  reducers: {
    clearInteractionsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Hydrate from backend ───────────────────────────────────────────────
      .addCase(fetchMyInteractions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.likedIds = action.payload.likedIds;
        state.bookmarkedIds = action.payload.bookmarkedIds;
      })
      .addCase(fetchMyInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBookmarkedTweets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookmarkedTweets.fulfilled, (state, action) => {
        state.loading = false;
        state.bookmarkedTweets = action.payload;
      })
      .addCase(fetchBookmarkedTweets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Like (optimistic + rollback) ───────────────────────────────────────
      .addCase(likeTweet.pending, (state, action) => {
        const id = action.meta.arg;
        if (!state.likedIds.includes(id)) {
          state.likedIds.push(id);
          state.likeDelta[id] = (state.likeDelta[id] ?? 0) + 1;
        }
      })
      .addCase(likeTweet.rejected, (state, action) => {
        const id = action.meta.arg;
        if (state.likedIds.includes(id)) {
          state.likedIds = withoutId(state.likedIds, id);
          state.likeDelta[id] = (state.likeDelta[id] ?? 0) - 1;
        }
        state.error = action.payload;
      })
      .addCase(unlikeTweet.pending, (state, action) => {
        const id = action.meta.arg;
        if (state.likedIds.includes(id)) {
          state.likedIds = withoutId(state.likedIds, id);
          state.likeDelta[id] = (state.likeDelta[id] ?? 0) - 1;
        }
      })
      .addCase(unlikeTweet.rejected, (state, action) => {
        const id = action.meta.arg;
        if (!state.likedIds.includes(id)) {
          state.likedIds.push(id);
          state.likeDelta[id] = (state.likeDelta[id] ?? 0) + 1;
        }
        state.error = action.payload;
      })

      // ── Bookmark (optimistic + rollback) ───────────────────────────────────
      .addCase(bookmarkTweet.pending, (state, action) => {
        const id = action.meta.arg;
        if (!state.bookmarkedIds.includes(id)) state.bookmarkedIds.push(id);
      })
      .addCase(bookmarkTweet.rejected, (state, action) => {
        const id = action.meta.arg;
        state.bookmarkedIds = withoutId(state.bookmarkedIds, id);
        state.error = action.payload;
      })
      .addCase(unbookmarkTweet.pending, (state, action) => {
        const id = action.meta.arg;
        state.bookmarkedIds = withoutId(state.bookmarkedIds, id);
        const removed = state.bookmarkedTweets.find(
          (t) => (t.statistics?.tweetId ?? t.id) === id
        );
        if (removed) {
          state.lastRemovedBookmark = removed;
          state.bookmarkedTweets = state.bookmarkedTweets.filter((t) => t !== removed);
        }
      })
      .addCase(unbookmarkTweet.fulfilled, (state) => {
        state.lastRemovedBookmark = null;
      })
      .addCase(unbookmarkTweet.rejected, (state, action) => {
        const id = action.meta.arg;
        if (!state.bookmarkedIds.includes(id)) state.bookmarkedIds.push(id);
        if (state.lastRemovedBookmark) {
          state.bookmarkedTweets = [state.lastRemovedBookmark, ...state.bookmarkedTweets];
          state.lastRemovedBookmark = null;
        }
        state.error = action.payload;
      })

      // ── Retweet (optimistic + rollback) ────────────────────────────────────
      .addCase(retweetTweet.pending, (state, action) => {
        const id = action.meta.arg;
        if (!state.retweetedIds.includes(id)) {
          state.retweetedIds.push(id);
          state.retweetDelta[id] = (state.retweetDelta[id] ?? 0) + 1;
        }
      })
      .addCase(retweetTweet.rejected, (state, action) => {
        const id = action.meta.arg;
        if (state.retweetedIds.includes(id)) {
          state.retweetedIds = withoutId(state.retweetedIds, id);
          state.retweetDelta[id] = (state.retweetDelta[id] ?? 0) - 1;
        }
        state.error = action.payload;
      })
      .addCase(unretweetTweet.pending, (state, action) => {
        const id = action.meta.arg;
        if (state.retweetedIds.includes(id)) {
          state.retweetedIds = withoutId(state.retweetedIds, id);
          state.retweetDelta[id] = (state.retweetDelta[id] ?? 0) - 1;
        }
      })
      .addCase(unretweetTweet.rejected, (state, action) => {
        const id = action.meta.arg;
        if (!state.retweetedIds.includes(id)) {
          state.retweetedIds.push(id);
          state.retweetDelta[id] = (state.retweetDelta[id] ?? 0) + 1;
        }
        state.error = action.payload;
      });
  },
});

export const { clearInteractionsError } = interactionsSlice.actions;
export default interactionsSlice.reducer;
