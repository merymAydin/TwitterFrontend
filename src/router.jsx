// Route path constants — single source of truth for navigation links.
// Aligned to the audited Spring Boot backend contract. No invented paths.
export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  HOME: "/",
  TWEET_DETAIL: (id) => `/tweet/${id}`,
  PROFILE: (username) => `/profile/${username}`,
  NOTIFICATIONS: "/notifications",
  EXPLORE: "/explore",
  SETTINGS: "/settings",
};
