// API endpoint constants aligned exactly to the audited Spring Boot backend contract.
// These are the only endpoints the frontend calls. No invented, renamed, or assumed paths.
export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
  },
  USERS: {
    REGISTER: "/users",
    LIST: "/users",
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
  },
  BOOKMARKS: {
    CREATE: "/bookmarks",
    DELETE: "/bookmarks",
  },
  FOLLOWERS: {
    FOLLOW: "/followers",
    UNFOLLOW: "/followers",
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
};
