import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { formatApiError } from "../../lib/utils";

// Upper bound for the "own tweets" lookup. There is no per-user tweets endpoint
// on the backend, so the current user's tweets are selected client-side from the
// global list (newest first). This caps how far back that scan goes.
const OWN_TWEETS_PAGE_SIZE = 100;

function normalizePage(data) {
  if (Array.isArray(data)) return data;
  return data?.content ?? data?.data ?? [];
}

function tweetIdOf(tweet) {
  return tweet?.id ?? tweet?.statistics?.tweetId ?? null;
}

/*
 * Home timeline = tweets from the users you follow (GET /feed) MERGED with your
 * own tweets.
 *
 * Endpoint facts (verified against the Spring Boot source):
 *   GET /feed  -> FeedServiceImpl: only the users you FOLLOW. It never returns
 *                 your own tweets (self-follow is rejected), so a just-created
 *                 tweet would disappear after a reload.
 *   GET /tweet -> TweetServiceImpl.findAllTweets(): every persisted tweet.
 *                 There is no per-user tweets endpoint.
 *
 * The merge de-duplicates by tweet id and orders newest-first (id,desc), which
 * the Feed renders. `page`/`size` are still forwarded to GET /feed so the
 * following-timeline paging window is preserved.
 */
export const fetchTweets = createAsyncThunk(
  "tweets/fetchAll",
  async ({ page = 0, size = 20 } = {}, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth.user?.userId ?? null;

      const [feedRes, allRes] = await Promise.all([
        api.get(ENDPOINTS.FEED.LIST, { params: { page, size } }),
        userId != null
          ? api.get(ENDPOINTS.TWEETS.LIST, {
              params: { page: 0, size: OWN_TWEETS_PAGE_SIZE, sort: "id,desc" },
            })
          : Promise.resolve(null),
      ]);

      const following = normalizePage(feedRes.data);
      const own = allRes
        ? normalizePage(allRes.data).filter((tweet) => tweet.userId === userId)
        : [];

      const byId = new Map();
      for (const tweet of [...own, ...following]) {
        const id = tweetIdOf(tweet);
        if (id == null || byId.has(id)) continue;
        byId.set(id, tweet);
      }
      return [...byId.values()].sort((a, b) => tweetIdOf(b) - tweetIdOf(a));
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to load tweets"));
    }
  }
);

// Tweets authored by one user (for the profile page). No per-user endpoint
// exists, so the global list is filtered client-side by userId.
export const fetchUserTweets = createAsyncThunk(
  "tweets/fetchByUser",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.TWEETS.LIST, {
        params: { page: 0, size: OWN_TWEETS_PAGE_SIZE, sort: "id,desc" },
      });
      return normalizePage(response.data).filter((tweet) => tweet.userId === Number(userId));
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to load posts"));
    }
  }
);

export const fetchTweet = createAsyncThunk("tweets/fetchOne", async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(ENDPOINTS.TWEETS.DETAIL(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to load tweet"));
  }
});

export const createTweet = createAsyncThunk("tweets/create", async (tweetData, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.TWEETS.CREATE, tweetData);
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to create tweet"));
  }
});

/*
 * Explore timeline = all public tweets (GET /tweet).
 * No merge with followed users — pure global newest-first pagination.
 */
export const fetchExploreTweets = createAsyncThunk(
  "tweets/fetchExplore",
  async ({ page = 0, size = 20 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.TWEETS.LIST, {
        params: { page, size, sort: "id,desc" },
      });
      return normalizePage(response.data);
    } catch (error) {
      return rejectWithValue(formatApiError(error, "Failed to load explore tweets"));
    }
  }
);

export const updateTweet = createAsyncThunk("tweets/update", async ({ id, tweetData }, { rejectWithValue }) => {
  try {
    const response = await api.put(ENDPOINTS.TWEETS.UPDATE(id), tweetData);
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to update tweet"));
  }
});

export const deleteTweet = createAsyncThunk("tweets/delete", async (id, { rejectWithValue }) => {
  try {
    const response = await api.delete(ENDPOINTS.TWEETS.DELETE(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to delete tweet"));
  }
});

export const retweet = createAsyncThunk("tweets/retweet", async (id, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.TWEETS.RETWEET(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to retweet"));
  }
});

export const unretweet = createAsyncThunk("tweets/unretweet", async (id, { rejectWithValue }) => {
  try {
    const response = await api.delete(ENDPOINTS.TWEETS.UNRETWEET(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to undo retweet"));
  }
});

export const quoteTweet = createAsyncThunk("tweets/quote", async ({ id, quoteData }, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.TWEETS.QUOTE(id), quoteData);
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to quote tweet"));
  }
});

export const unquoteTweet = createAsyncThunk("tweets/unquote", async (quoteTweetId, { rejectWithValue }) => {
  try {
    const response = await api.delete(ENDPOINTS.TWEETS.UNQUOTE(quoteTweetId));
    return response.data;
  } catch (error) {
    return rejectWithValue(formatApiError(error, "Failed to delete quote"));
  }
});

// Note: likes & bookmarks live in store/slices/interactionsSlice.js, which owns
// the optimistic UI and the current user's liked/bookmarked state.

const initialState = {
  items: [],
  current: null,
  userTweets: [],
  exploreTweets: [],
  exploreLoading: false,
  exploreError: null,
  explorePage: 0,
  exploreHasMore: true,
  loading: false,
  userTweetsLoading: false,
  error: null,
};

const tweetsSlice = createSlice({
  name: "tweets",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentTweet: (state, action) => {
      state.current = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTweets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTweets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTweets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchUserTweets.pending, (state) => {
        state.userTweetsLoading = true;
        state.error = null;
      })
      .addCase(fetchUserTweets.fulfilled, (state, action) => {
        state.userTweetsLoading = false;
        state.userTweets = action.payload;
      })
      .addCase(fetchUserTweets.rejected, (state, action) => {
        state.userTweetsLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchTweet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTweet.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchTweet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchExploreTweets.pending, (state, action) => {
        const page = action.meta.arg?.page ?? 0;
        if (page === 0) {
          state.exploreLoading = true;
          state.exploreError = null;
        }
      })
      .addCase(fetchExploreTweets.fulfilled, (state, action) => {
        state.exploreLoading = false;
        const page = action.meta.arg?.page ?? 0;
        const newTweets = action.payload;
        if (page === 0) {
          state.exploreTweets = newTweets;
        } else {
          state.exploreTweets = [...state.exploreTweets, ...newTweets];
        }
        state.explorePage = page;
        state.exploreHasMore = newTweets.length > 0;
      })
      .addCase(fetchExploreTweets.rejected, (state, action) => {
        state.exploreLoading = false;
        state.exploreError = action.payload;
      })
      .addCase(createTweet.fulfilled, (state, action) => {
        // Server response is prepended so the new tweet is visible immediately,
        // matching the newest-first order of the timeline.
        state.items.unshift(action.payload);
      })
      .addCase(quoteTweet.fulfilled, (state, action) => {
        // Server response is prepended so the quoted tweet is visible immediately.
        state.items.unshift(action.payload);
      })
      .addCase(updateTweet.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.items.findIndex((t) => tweetIdOf(t) === tweetIdOf(updated));
        if (index !== -1) {
          state.items[index] = updated;
        }
      })
      .addCase(deleteTweet.fulfilled, (state, action) => {
        // DELETE returns 204 (empty body), so the id comes from the thunk arg.
        const deletedId = Number(action.meta.arg);
        state.items = state.items.filter((t) => tweetIdOf(t) !== deletedId);
        state.userTweets = state.userTweets.filter((t) => tweetIdOf(t) !== deletedId);
        state.exploreTweets = state.exploreTweets.filter((t) => tweetIdOf(t) !== deletedId);
      });
  },
});

export const { clearError, setCurrentTweet } = tweetsSlice.actions;
export default tweetsSlice.reducer;
