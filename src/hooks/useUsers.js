import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUsers,
  fetchUserById,
  updateUser,
  clearUsersError,
  clearProfile,
} from "../store/slices/usersSlice";

export function useUsers() {
  const dispatch = useDispatch();
  const { items, byId, byUsername, profile, loading, profileLoading, saving, error } =
    useSelector((state) => state.users);

  const loadUsers = useCallback(() => dispatch(fetchUsers()), [dispatch]);
  const loadProfile = useCallback((id) => dispatch(fetchUserById(id)), [dispatch]);
  const saveProfile = (id, userData) => dispatch(updateUser({ id, userData }));
  const resetProfile = useCallback(() => dispatch(clearProfile()), [dispatch]);

  return {
    users: items,
    byId,
    byUsername,
    profile,
    loading,
    profileLoading,
    saving,
    error,
    loadUsers,
    loadProfile,
    saveProfile,
    resetProfile,
    clearUsersError: () => dispatch(clearUsersError()),
  };
}
