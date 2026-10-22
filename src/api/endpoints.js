// API endpoint constants aligned exactly to the audited Spring Boot backend contract.
// These are the only endpoints the frontend calls. No invented, renamed, or assumed paths.
export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
  },
  USERS: {
    REGISTER: "/users",
    LIST: "/users",
    ME: "/users/me",
    DETAIL: (id) => `/users/${id}`,
    SEARCH: (keyword) => `/users/search?keyword=${encodeURIComponent(keyword)}`,
    UPDATE: (id) => `/users/${id}`,
    DELETE: (id) => `/users/${id}`,
  },
  TWEETS: {
    CREATE: "/tweet",
    LIST: "/tweet",
    DETAIL: (id) => `/tweet/${id}`,
    UPDATE: (id) => `/tweet/${id}`,
    DELETE: (id) => `/tweet/${id}`,
    SEARCH: (keyword) => `/tweet/search?keyword=${encodeURIComponent(keyword)}`,
    RETWEET: (id) => `/tweet/${id}/retweet`,
    UNRETWEET: (id) => `/tweet/${id}/retweet`,
    QUOTE: (id) => `/tweet/${id}/quote`,
    UNQUOTE: (quoteTweetId) => `/tweet/${quoteTweetId}/quote`,
  },
  COMMENTS: {
    CREATE: "/comments",
    LIST: "/comments",
    DETAIL: (id) => `/comments/${id}`,
    UPDATE: (id) => `/comments/${id}`,
    DELETE: (id) => `/comments/${id}`,
  },
  LIKES: {
    CREATE: "/likes",
    DELETE: "/likes",
    // GET /likes returns every like ({ userId, tweetId }); the client filters by userId.
    LIST: "/likes",
  },
  BOOKMARKS: {
    CREATE: "/bookmarks",
    DELETE: "/bookmarks",
    // GET /bookmarks returns every bookmark ({ userId, tweetId }); the client filters by userId.
    LIST: "/bookmarks",
  },
  FOLLOWERS: {
    FOLLOW: "/followers",
    UNFOLLOW: "/followers",
    // GET /followers returns every relationship ({ followerId, followingId });
    // there is no per-user and no count endpoint, so the client filters.
    LIST: "/followers",
    // NOTE: this id is the relationship's own primary key, NOT a user id.
    DETAIL: (id) => `/followers/${id}`,
  },
  STRIPE: {
    // Public Stripe.js configuration: { publishableKey, mode }. 503 when the
    // server has no STRIPE_PUBLISHABLE_KEY configured.
    CONFIG: "/stripe/config",
    // Ownership is derived from the JWT on the server; {userId} must match it.
    // POST /stripe/customer is idempotent and returns the stored customer id.
    CUSTOMER: "/stripe/customer",
    // Query params, not a JSON body.
    SETUP_INTENT: (userId) => `/stripe/setup-intent/${userId}`,
    PAYMENT_METHOD: (userId) => `/stripe/payment-method/${userId}`,
    SUBSCRIPTION: (userId) => `/stripe/subscription/${userId}`,
    // Authoritative subscription state for the signed-in user.
    STATUS: "/stripe/status",
    STATUS_FOR: (userId) => `/stripe/subscription/${userId}`,
    CANCEL: (userId) => `/stripe/subscription/${userId}/cancel`,
    HISTORY: (userId) => `/stripe/subscriptions/${userId}`,
  },
  FEED: {
    LIST: "/feed",
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    READ: (id) => `/notifications/${id}/read`,
  },
  STATISTICS: {
    LIST: "/statistics",
    DETAIL: (id) => `/statistics/${id}`,
    TWEET: (tweetId) => `/statistics/tweet/${tweetId}`,
  },
  AI: {
    CHAT: "/api/gemini/chat",
    REWRITE: (id) => `/api/gemini/rewrite/${id}`,
    REWRITE_DRAFT: "/api/gemini/rewriteDraft",
    SUMMARIZE: "/api/gemini/summarizeTweet",
    ANALYZE_USER: "/api/gemini/analyzeUserTweets",
  },
};
