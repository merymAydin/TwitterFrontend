import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";

// Note: TweetResponse exposes the tweet ID at statistics.tweetId,
// not as a top-level id field. Slice state accounts for this shape.
// Fetches the authenticated user's feed from GET /feed with pagination.
export const fetchTweets = createAsyncThunk(
  "tweets/fetchAll",
  async ({ page = 0, size = 20 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(ENDPOINTS.FEED.LIST, {
        params: { page, size },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to load tweets");
    }
  }
);

export const fetchTweet = createAsyncThunk("tweets/fetchOne", async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(ENDPOINTS.TWEETS.DETAIL(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to load tweet");
  }
});

export const createTweet = createAsyncThunk("tweets/create", async (tweetData, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.TWEETS.CREATE, tweetData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to create tweet");
  }
});

export const updateTweet = createAsyncThunk("tweets/update", async ({ id, tweetData }, { rejectWithValue }) => {
  try {
    const response = await api.put(ENDPOINTS.TWEETS.UPDATE(id), tweetData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to update tweet");
  }
});

export const deleteTweet = createAsyncThunk("tweets/delete", async (id, { rejectWithValue }) => {
  try {
    const response = await api.delete(ENDPOINTS.TWEETS.DELETE(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to delete tweet");
  }
});

export const retweet = createAsyncThunk("tweets/retweet", async (id, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.TWEETS.RETWEET(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to retweet");
  }
});

export const unretweet = createAsyncThunk("tweets/unretweet", async (id, { rejectWithValue }) => {
  try {
    const response = await api.delete(ENDPOINTS.TWEETS.UNRETWEET(id));
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to undo retweet");
  }
});

export const quoteTweet = createAsyncThunk("tweets/quote", async ({ id, quoteData }, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.TWEETS.QUOTE(id), quoteData);
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to quote tweet");
  }
});

export const unquoteTweet = createAsyncThunk("tweets/unquote", async (quoteTweetId, { rejectWithValue }) => {
  try {
    const response = await api.delete(ENDPOINTS.TWEETS.UNQUOTE(quoteTweetId));
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to delete quote");
  }
});

export const likeTweet = createAsyncThunk("tweets/like", async (tweetId, { rejectWithValue }) => {
  try {
    const response = await api.post(ENDPOINTS.LIKES.CREATE, { tweetId });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to like tweet");
  }
});

export const unlikeTweet = createAsyncThunk("tweets/unlike", async (tweetId, { rejectWithValue }) => {
  try {
    const response = await api.delete(ENDPOINTS.LIKES.DELETE, { data: { tweetId } });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data || "Failed to unlike tweet");
  }
});

const initialState = {
  items: [],
  current: null,
  loading: false,
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
      .addCase(createTweet.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateTweet.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.items.findIndex((t) => {
          const tweetId = t.statistics?.tweetId ?? t.id;
          return tweetId === (updated.statistics?.tweetId ?? updated.id);
        });
        if (index !== -1) {
          state.items[index] = updated;
        }
      })
      .addCase(deleteTweet.fulfilled, (state, action) => {
        const deletedId = action.payload?.statistics?.tweetId ?? action.payload?.id;
        state.items = state.items.filter((t) => {
          const tweetId = t.statistics?.tweetId ?? t.id;
          return tweetId !== deletedId;
        });
      })
      .addCase(likeTweet.fulfilled, (state, action) => {
  const { tweetId } = action.payload;

  const tweet = state.items.find(
    (t) => (t.statistics?.tweetId ?? t.id) === tweetId
  );

  if (tweet?.statistics) {
    tweet.statistics.likes =
      (tweet.statistics.likes ?? 0) + 1;
  }
})
      .addCase(unlikeTweet.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.items.findIndex((t) => {
          const tweetId = t.statistics?.tweetId ?? t.id;
          return tweetId === (updated.statistics?.tweetId ?? updated.id);
        });
        if (index !== -1) {
          state.items[index] = updated;
        }
      });
  },
});

export const {
  clearError,
  setCurrentTweet,
} = tweetsSlice.actions;
export default tweetsSlice.reducer;
