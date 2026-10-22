import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTweets,
  fetchUserTweets,
  fetchTweet,
  fetchExploreTweets,
  createTweet,
  quoteTweet,
  clearError,
  setCurrentTweet,
} from "../store/slices/tweetsSlice";

export function useTweets() {
  const dispatch = useDispatch();
  const { items, current, userTweets, exploreTweets, exploreLoading, exploreError, exploreHasMore, loading, userTweetsLoading, error } = useSelector(
    (state) => state.tweets
  );

  const loadTweets = useCallback((params) => dispatch(fetchTweets(params)), [dispatch]);
  const loadUserTweets = useCallback((userId) => dispatch(fetchUserTweets(userId)), [dispatch]);
  // These must be stable: they are used as effect dependencies (e.g. TweetDetail
  // loads a tweet in useEffect), and a new identity on every render would make
  // that effect re-run endlessly.
  const loadTweet = useCallback((id) => dispatch(fetchTweet(id)), [dispatch]);
  const loadExploreTweets = useCallback((params) => dispatch(fetchExploreTweets(params)), [dispatch]);
  const postTweet = useCallback((tweetData) => dispatch(createTweet(tweetData)), [dispatch]);
  const quoteTweetFn = useCallback((id, quoteData) => dispatch(quoteTweet({ id, quoteData })), [dispatch]);
  const clearTweetError = useCallback(() => dispatch(clearError()), [dispatch]);
  const setCurrent = useCallback((tweet) => dispatch(setCurrentTweet(tweet)), [dispatch]);

  return {
    tweets: items,
    currentTweet: current,
    userTweets,
    exploreTweets,
    exploreLoading,
    exploreError,
    exploreHasMore,
    loading,
    userTweetsLoading,
    error,
    loadTweets,
    loadUserTweets,
    loadTweet,
    loadExploreTweets,
    postTweet,
    quoteTweet: quoteTweetFn,
    clearTweetError,
    setCurrent,
  };
}
