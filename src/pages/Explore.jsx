import { useEffect, useState } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Skeleton } from "../components/ui/Skeleton";
import { Tweet } from "../components/tweets/Tweet";
import { Button } from "../components/ui/Button";
import { useTweets } from "../hooks/useTweets";

export function Explore() {
  const { exploreTweets, exploreLoading, exploreError, exploreHasMore, loadExploreTweets } =
    useTweets();

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadExploreTweets({ page: 0, size: 20 });
    setPage(0);
    setHasMore(true);
  }, [loadExploreTweets]);

  const handleLoadMore = () => {
    if (exploreLoading || !hasMore) return;
    const nextPage = page + 1;
    loadExploreTweets({ page: nextPage, size: 20 });
    setPage(nextPage);
  };

  useEffect(() => {
    setHasMore(exploreHasMore);
  }, [exploreHasMore]);

  const isEmpty = exploreTweets.length === 0;
  const isInitialLoad = exploreLoading && page === 0;

  return (
    <div>
      <PageHeader title="Explore" description="Discover what's happening" />

      {exploreError && <ErrorMessage message={exploreError} />}

      {isInitialLoad ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isEmpty ? (
        <EmptyState title="No posts yet" description="There's nothing to explore right now." />
      ) : (
        <>
          <ul className="space-y-4" role="list">
            {exploreTweets.map((tweet) => (
              <li key={tweet.statistics?.tweetId ?? tweet.id}>
                <Tweet tweet={tweet} />
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={exploreLoading}
                className="w-full max-w-xs"
              >
                {exploreLoading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

