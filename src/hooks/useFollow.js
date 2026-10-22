import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFollowers,
  followUser,
  unfollowUser,
  clearFollowersError,
  relationshipKey,
} from "../store/slices/followersSlice";

/**
 * Follow state for the signed-in user.
 *
 * GET /followers returns the whole collection, so every helper here filters
 * that one list: whether the current user follows someone, the followers and
 * following of any user, and the two counts shown on a profile.
 */
export function useFollow() {
  const dispatch = useDispatch();
  const currentUserId = useSelector((state) => state.auth.user?.userId);
  const { relationships, pending, loading, error } = useSelector((state) => state.followers);

  const loadFollowers = useCallback(() => dispatch(fetchFollowers()), [dispatch]);

  const isFollowing = useCallback(
    (userId) =>
      currentUserId != null &&
      userId != null &&
      relationships.some(
        (r) => r.followerId === currentUserId && r.followingId === Number(userId)
      ),
    [relationships, currentUserId]
  );

  // True while this specific relationship has a request in flight.
  const isPending = useCallback(
    (userId) =>
      currentUserId != null &&
      userId != null &&
      !!pending[relationshipKey(currentUserId, Number(userId))],
    [pending, currentUserId]
  );

  const follow = useCallback(
    (userId) =>
      dispatch(followUser({ followerId: currentUserId, followingId: Number(userId) })),
    [dispatch, currentUserId]
  );

  const unfollow = useCallback(
    (userId) =>
      dispatch(unfollowUser({ followerId: currentUserId, followingId: Number(userId) })),
    [dispatch, currentUserId]
  );

  // Follow and unfollow from one call: the current relationship decides which.
  const toggleFollow = useCallback(
    (userId) => (isFollowing(userId) ? unfollow(userId) : follow(userId)),
    [isFollowing, follow, unfollow]
  );

  // Ids of the users who follow `userId`.
  const followersOf = useCallback(
    (userId) =>
      userId == null
        ? []
        : relationships.filter((r) => r.followingId === Number(userId)).map((r) => r.followerId),
    [relationships]
  );

  // Ids of the users `userId` follows.
  const followingOf = useCallback(
    (userId) =>
      userId == null
        ? []
        : relationships.filter((r) => r.followerId === Number(userId)).map((r) => r.followingId),
    [relationships]
  );

  const followersCount = useCallback((userId) => followersOf(userId).length, [followersOf]);
  const followingCount = useCallback((userId) => followingOf(userId).length, [followingOf]);

  return {
    currentUserId,
    loadFollowers,
    isFollowing,
    isPending,
    follow,
    unfollow,
    toggleFollow,
    followersOf,
    followingOf,
    followersCount,
    followingCount,
    loading,
    error,
    clearError: () => dispatch(clearFollowersError()),
  };
}
