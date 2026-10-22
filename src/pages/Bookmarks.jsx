import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useInteractions } from "../hooks/useInteractions";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Skeleton } from "../components/ui/Skeleton";
import { Tweet } from "../components/tweets/Tweet";

export function Bookmarks() {
  const { bookmarkedTweets, loading, error, loadInteractions, loadBookmarkedTweets } =
    useInteractions();
  const currentUserId = useSelector((state) => state.auth.user?.userId);

  // Wait until the current user is resolved — the bookmark collection is
  // filtered by userId, so requesting before then would be premature.
  useEffect(() => {
    if (currentUserId == null) return;
    loadInteractions();
    loadBookmarkedTweets();
  }, [currentUserId, loadInteractions, loadBookmarkedTweets]);

  const isEmpty = bookmarkedTweets.length === 0;

  return (
    <div>
      <PageHeader title="Bookmarks" description="Saved posts" />

      {error && <ErrorMessage message={error} />}

      {loading && isEmpty ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          title="No bookmarks yet"
          description="Save posts to find them here later."
        />
      ) : (
        <ul className="space-y-4" role="list">
          {bookmarkedTweets.map((tweet) => (
            <li key={tweet.statistics?.tweetId ?? tweet.id}>
              <Tweet tweet={tweet} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

