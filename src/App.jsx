import { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout, fetchCurrentUser } from "./store/slices/authSlice";
import { fetchMyInteractions } from "./store/slices/interactionsSlice";
import { fetchUsers } from "./store/slices/usersSlice";
import { fetchFollowers } from "./store/slices/followersSlice";
import { fetchSubscriptionStatus } from "./store/slices/subscriptionSlice";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Home } from "./pages/Home";
import { TweetDetail } from "./pages/TweetDetail";
import { Profile } from "./pages/Profile";
import { Notifications } from "./pages/Notifications";
import { Explore } from "./pages/Explore";
import { Bookmarks } from "./pages/Bookmarks";
import { Settings } from "./pages/Settings";
import { Verified } from "./pages/Verified";
import { ROUTES } from "./router";

const PUBLIC_PATHS = [ROUTES.LOGIN, ROUTES.REGISTER];

const PublicRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
  </Routes>
);

const PrivateRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/tweet/:id" element={<TweetDetail />} />
    <Route path="/profile/:id" element={<Profile />} />
    <Route path="/notifications" element={<Notifications />} />
    <Route path="/explore" element={<Explore />} />
    <Route path="/bookmarks" element={<Bookmarks />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="/verified" element={<Verified />} />
  </Routes>
);

export default function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const location = useLocation();

  // Synchronize Redux with localStorage: if a 401 cleared the token but Redux
  // still believes the user is authenticated (e.g. after navigation without
  // full reload), dispatch logout to bring state back in line.
  useEffect(() => {
    const hasToken = !!localStorage.getItem("token");
    if (!hasToken && isAuthenticated) {
      dispatch(logout());
    }
  }, [dispatch, isAuthenticated]);

  // Resolve the current user from GET /users/me so the global like/bookmark
  // collections can be filtered down to this user.
  useEffect(() => {
    if (isAuthenticated && !user) dispatch(fetchCurrentUser());
  }, [dispatch, isAuthenticated, user]);

  // Load the user's likes and bookmarks once the user id is known.
  useEffect(() => {
    if (user?.userId != null) dispatch(fetchMyInteractions());
  }, [dispatch, user?.userId]);

  // Load the user directory (GET /users) once authenticated. Tweets and comments
  // only carry a userId, so author names/avatars are resolved from this map.
  useEffect(() => {
    if (isAuthenticated) dispatch(fetchUsers());
  }, [dispatch, isAuthenticated]);

  // Load the follow graph (GET /followers) once the current user is known. It
  // backs the Follow/Unfollow buttons and the follower/following counts, so the
  // state is restored from the backend after every page refresh.
  useEffect(() => {
    if (user?.userId != null) dispatch(fetchFollowers());
  }, [dispatch, user?.userId]);

  // Load the subscription state (GET /stripe/status). The blue check is driven
  // by this backend value only — never by local state.
  useEffect(() => {
    if (user?.userId != null) dispatch(fetchSubscriptionStatus());
  }, [dispatch, user?.userId]);

  const isPublicPath = PUBLIC_PATHS.includes(location.pathname);

  // Redirect authenticated users away from login/register to home.
  if (isAuthenticated && isPublicPath) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  // Redirect unauthenticated users away from private routes to login.
  if (!isAuthenticated && !isPublicPath) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return (
    <>
      {!isAuthenticated ? (
        <AuthLayout>
          <PublicRoutes />
        </AuthLayout>
      ) : (
        <AppLayout>
          <PrivateRoutes />
        </AppLayout>
      )}
    </>
  );
}

