import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMyInteractions,
  fetchBookmarkedTweets,
  likeTweet,
  unlikeTweet,
  bookmarkTweet,
  unbookmarkTweet,
  retweetTweet,
  unretweetTweet,
  clearInteractionsError,
} from "../store/slices/interactionsSlice";

export function useInteractions() {
  const dispatch = useDispatch();
  const { likedIds, bookmarkedIds, retweetedIds, likeDelta, retweetDelta, bookmarkedTweets, loading, error } =
    useSelector((state) => state.interactions);

  const loadInteractions = useCallback(() => dispatch(fetchMyInteractions()), [dispatch]);
  const loadBookmarkedTweets = useCallback(() => dispatch(fetchBookmarkedTweets()), [dispatch]);

  const toggleLike = useCallback(
    (tweetId) => {
      const id = Number(tweetId);
      return likedIds.includes(id)
        ? dispatch(unlikeTweet(id))
        : dispatch(likeTweet(id));
    },
    [dispatch, likedIds]
  );

  const toggleBookmark = useCallback(
    (tweetId) => {
      const id = Number(tweetId);
      return bookmarkedIds.includes(id)
        ? dispatch(unbookmarkTweet(id))
        : dispatch(bookmarkTweet(id));
    },
    [dispatch, bookmarkedIds]
  );

  const toggleRetweet = useCallback(
    (tweetId) => {
      const id = Number(tweetId);
      return retweetedIds.includes(id)
        ? dispatch(unretweetTweet(id))
        : dispatch(retweetTweet(id));
    },
    [dispatch, retweetedIds]
  );

  return {
    likedIds,
    bookmarkedIds,
    retweetedIds,
    likeDelta,
    retweetDelta,
    bookmarkedTweets,
    loading,
    error,
    isLiked: (tweetId) => likedIds.includes(Number(tweetId)),
    isBookmarked: (tweetId) => bookmarkedIds.includes(Number(tweetId)),
    isRetweeted: (tweetId) => retweetedIds.includes(Number(tweetId)),
    loadInteractions,
    loadBookmarkedTweets,
    toggleLike,
    toggleBookmark,
    toggleRetweet,
    clearInteractionsError: () => dispatch(clearInteractionsError()),
  };
}
