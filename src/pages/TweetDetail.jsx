import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTweets } from "../hooks/useTweets";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Tweet } from "../components/tweets/Tweet";

export function TweetDetail() {
  const { id } = useParams();
  const { currentTweet, loading, error, loadTweet } = useTweets();

  useEffect(() => {
    if (id) loadTweet(id);
  }, [id, loadTweet]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <div className="py-20 text-center text-foreground-muted">{error}</div>;

  return (
    <div>
      <PageHeader title="Tweet" />
      {!currentTweet ? (
        <EmptyState title="Tweet not found" description="The post you're looking for doesn't exist." />
      ) : (
        <article className="prose-width">
          <Tweet tweet={currentTweet} />
        </article>
      )}
    </div>
  );
}
