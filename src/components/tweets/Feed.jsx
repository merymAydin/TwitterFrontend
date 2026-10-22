import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useTweets } from "../../hooks/useTweets";
import { useUsers } from "../../hooks/useUsers";
import { Tweet } from "./Tweet";
import { EmptyState } from "../common/EmptyState";
import { ErrorMessage } from "../common/ErrorMessage";
import { Skeleton } from "../ui/Skeleton";

export function Feed() {
  const { tweets, loading, error, loadTweets } = useTweets();
  const { loading: usersLoading } = useUsers();
  const currentUserId = useSelector((state) => state.auth.user?.userId);

  // Refetch whenever the signed-in user changes, so their own tweets stay merged.
  useEffect(() => {
    if (currentUserId == null) return;
    loadTweets({ page: 0, size: 20 });
  }, [currentUserId, loadTweets]);

  // Wait for the user id AND the users directory before rendering — otherwise
  // the first paint would show tweets without author info (including the
  // Premium badge which is resolved from the users map).
  if (currentUserId == null || loading || usersLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (tweets.length === 0) {
    return (
      <EmptyState
        title="No posts yet"
        description="Follow people or share your first post."
      />
    );
  }

  return (
    <div className="w-full px-6">
      <ul className="space-y-4" role="list">
        {tweets.map((tweet) => (
          <li key={tweet.statistics?.tweetId ?? tweet.id}>
            <Tweet tweet={tweet} />
          </li>
        ))}
      </ul>
    </div>
  );
}

