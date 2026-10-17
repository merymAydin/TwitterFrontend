import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTweets,
  fetchTweet,
  createTweet,
  likeTweet,
  clearError,
  setCurrentTweet,
} from "../store/slices/tweetsSlice";

export function useTweets() {
  const dispatch = useDispatch();
  const { items, current, loading, error } = useSelector((state) => state.tweets);

  const loadTweets = useCallback((params) => dispatch(fetchTweets(params)), [dispatch]);
  const loadTweet = (id) => dispatch(fetchTweet(id));
  const postTweet = (tweetData) => dispatch(createTweet(tweetData));
  const like = (id) => dispatch(likeTweet(id));
  const clearTweetError = () => dispatch(clearError());
  const setCurrent = (tweet) => dispatch(setCurrentTweet(tweet));

  return {
    tweets: items,
    currentTweet: current,
    loading,
    error,
    loadTweets,
    loadTweet,
    postTweet,
    like,
    clearTweetError,
    setCurrent,
  };
}
