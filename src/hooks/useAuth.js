import { useDispatch, useSelector } from "react-redux";
import { login, register, logout, clearError } from "../store/slices/authSlice";

export function useAuth() {
  const dispatch = useDispatch();
  const { token, isAuthenticated, user, loading, error } = useSelector((state) => state.auth);

  const signIn = (credentials) => dispatch(login(credentials));
  const signUp = (userData) => dispatch(register(userData));
  const signOut = () => dispatch(logout());
  const clearAuthError = () => dispatch(clearError());

  return {
    token,
    isAuthenticated,
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    clearAuthError,
  };
}
