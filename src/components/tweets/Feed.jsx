import { useEffect } from "react";
import { useTweets } from "../../hooks/useTweets";
import { Tweet } from "./Tweet";
import { EmptyState } from "../common/EmptyState";
import { ErrorMessage } from "../common/ErrorMessage";
import { Skeleton } from "../ui/Skeleton";

export function Feed() {
  const { tweets, loading, error, loadTweets } = useTweets();

  useEffect(() => {
    loadTweets({ page: 0, size: 20 });
  }, []);

  if (loading) {
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
      <EmptyState title="No posts yet" description="Your feed is empty. Follow people to see their updates here." />
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4">
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
