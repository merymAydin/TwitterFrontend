import { Avatar } from "../ui/Avatar";

// Defensive helpers — the backend TweetResponse shape is not fully specified,
// so we read author and timestamp fields from multiple possible locations
// and only render them when they actually exist.
function getAuthorInfo(tweet) {
  if (!tweet) return null;

  // Nested author / user object
  if (tweet.author) {
    return {
      name: tweet.author.name ?? tweet.author.displayName ?? tweet.author.fullName,
      username: tweet.author.username ?? tweet.author.handle ?? tweet.author.screenName,
      avatar: tweet.author.avatar ?? tweet.author.profileImageUrl,
    };
  }
  if (tweet.user) {
    return {
      name: tweet.user.name ?? tweet.user.displayName ?? tweet.user.fullName,
      username: tweet.user.username ?? tweet.user.handle ?? tweet.user.screenName,
      avatar: tweet.user.avatar ?? tweet.user.profileImageUrl,
    };
  }

  // Flat fields
  return {
    name: tweet.authorName ?? tweet.author_name ?? tweet.displayName,
    username: tweet.authorUsername ?? tweet.author_username ?? tweet.handle,
    avatar: tweet.authorAvatar ?? tweet.author_avatar,
  };
}

function getTimestamp(tweet) {
  if (!tweet) return null;
  return tweet.createdAt ?? tweet.timestamp ?? tweet.postedAt ?? tweet.created_at;
}

function getContent(tweet) {
  if (!tweet) return null;
  return tweet.content ?? tweet.text ?? tweet.body;
}

export function TweetCard({ tweet }) {
  const tweetId = tweet.statistics?.tweetId ?? tweet.id;
  const content = getContent(tweet);
  const authorInfo = getAuthorInfo(tweet);
  const timestamp = getTimestamp(tweet);

  // A tweet without content is not renderable.
  if (!content) return null;

  return (
    <article className="border-b border-border py-4 last:border-0">
      <div className="flex gap-3">
        {authorInfo?.name || authorInfo?.username || authorInfo?.avatar ? (
          <Avatar
            src={authorInfo.avatar}
            username={authorInfo.name ?? authorInfo.username}
            size={32}
          />
        ) : (
          <div className="shrink-0 w-8 h-8 rounded-full bg-surface" />
        )}
        <div className="flex-1 min-w-0">
          {authorInfo?.name || authorInfo?.username || timestamp ? (
            <div className="flex items-baseline gap-1.5">
              {authorInfo?.name && (
                <span className="text-foreground font-sans text-small">{authorInfo.name}</span>
              )}
              {authorInfo?.username && (
                <span className="text-foreground-muted text-[0.75rem]">
                  @{authorInfo.username}
                </span>
              )}
              {timestamp && (
                <time className="ml-auto text-foreground-muted text-[0.75rem]">
                  {new Date(timestamp).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              )}
            </div>
          ) : null}
          <p className="mt-1 text-foreground font-sans text-body leading-relaxed">
            {content}
          </p>
        </div>
      </div>
    </article>
  );
}
