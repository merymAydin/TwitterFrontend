import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "./store/slices/authSlice";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Home } from "./pages/Home";
import { TweetDetail } from "./pages/TweetDetail";
import { Profile } from "./pages/Profile";
import { Notifications } from "./pages/Notifications";
import { Explore } from "./pages/Explore";
import { Settings } from "./pages/Settings";

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
    <Route path="/profile/:username" element={<Profile />} />
    <Route path="/notifications" element={<Notifications />} />
    <Route path="/explore" element={<Explore />} />
    <Route path="/settings" element={<Settings />} />
  </Routes>
);

export default function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const dispatch = useDispatch();

  // Synchronize Redux with localStorage: if a 401 cleared the token but Redux
  // still believes the user is authenticated (e.g. after navigation without
  // full reload), dispatch logout to bring state back in line.
  useEffect(() => {
    const hasToken = !!localStorage.getItem("token");
    if (!hasToken && isAuthenticated) {
      dispatch(logout());
    }
  }, [dispatch, isAuthenticated]);

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
