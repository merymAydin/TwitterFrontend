// Route path constants — single source of truth for navigation links.
// Aligned to the audited Spring Boot backend contract. No invented paths.
export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  HOME: "/",
  TWEET_DETAIL: (id) => `/tweet/${id}`,
  // Profiles are addressed by numeric user id (GET /users/{id}); the backend has
  // no username lookup for profile navigation.
  PROFILE: (id) => `/profile/${id}`,
  NOTIFICATIONS: "/notifications",
  EXPLORE: "/explore",
  BOOKMARKS: "/bookmarks",
  SETTINGS: "/settings",
  VERIFIED: "/verified",
};

