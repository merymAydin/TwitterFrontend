import { Avatar } from "../ui/Avatar";
import { AppLink } from "../ui/Link";
import { ROUTES } from "../../router";
import {
  Reply,
  RefreshCcw,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";

// Defensive helpers — the backend TweetResponse shape is not fully specified,
// so we read fields from multiple possible locations and only render what exists.
function getAuthorInfo(tweet) {
  if (!tweet) return null;

  if (tweet.author) {
    return {
      name: tweet.author.name ?? tweet.author.displayName ?? tweet.author.fullName,
      username: tweet.author.username ?? tweet.author.handle ?? tweet.author.screenName,
      avatar: tweet.author.avatar ?? tweet.author.profileImageUrl,
      id: tweet.author.id ?? tweet.author.userId,
    };
  }
  if (tweet.user) {
    return {
      name: tweet.user.name ?? tweet.user.displayName ?? tweet.user.fullName,
      username: tweet.user.username ?? tweet.user.handle ?? tweet.user.screenName,
      avatar: tweet.user.avatar ?? tweet.user.profileImageUrl,
      id: tweet.user.id ?? tweet.user.userId,
    };
  }

  return {
    name: tweet.authorName ?? tweet.author_name ?? tweet.displayName,
    username: tweet.authorUsername ?? tweet.author_username ?? tweet.handle,
    avatar: tweet.authorAvatar ?? tweet.author_avatar,
    id: tweet.authorId ?? tweet.userId,
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

function getStatistics(tweet) {
  if (!tweet) return {};
  const stats = tweet.statistics ?? {};
  return {
    tweetId: stats.tweetId ?? tweet.id,
    likes: stats.likes ?? 0,
  };
}

// Parse @mentions from tweet content. Returns array of { username, start, end }.
function parseMentions(content) {
  if (!content) return [];
  const mentions = [];
  const regex = /@(\w+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    mentions.push({
      username: match[1],
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
  }
  return mentions;
}

export function Tweet({ tweet }) {
  const tweetId = getStatistics(tweet).tweetId;
  const content = getContent(tweet);
  const authorInfo = getAuthorInfo(tweet);
  const timestamp = getTimestamp(tweet);
  const stats = getStatistics(tweet);

  // A tweet without content is not renderable.
  if (!content) return null;

  const canLinkToProfile = Boolean(authorInfo?.id && authorInfo?.username);
  const profileLink = canLinkToProfile ? ROUTES.PROFILE(authorInfo.id) : null;

  const renderName = () => {
    if (!authorInfo?.name && !authorInfo?.username) return null;
    return (
      <span className="flex items-center gap-2">
        {authorInfo?.name && (
          <span className="text-foreground font-sans text-base font-medium leading-none" style={{ letterSpacing: "-0.01em" }}>
            {canLinkToProfile && profileLink ? (
              <AppLink to={profileLink} className="text-foreground hover:text-cobalt transition-colors">
                {authorInfo.name}
              </AppLink>
            ) : (
              authorInfo.name
            )}
          </span>
        )}
        {authorInfo?.username && (
          <span className="text-foreground-muted text-xs font-sans leading-none">
            @{authorInfo.username}
          </span>
        )}
      </span>
    );
  };

  const formatTime = (ts) => {
    if (!ts) return null;
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return String(ts);
    }
  };

  const formattedTime = timestamp ? formatTime(timestamp) : null;
  const mentions = parseMentions(content);

  return (
    <article
      className="bg-[#F1F0EC] border border-[#E7E5E4] rounded-xl p-5 mb-4 hover:bg-[#E7E5E4] transition-colors w-full"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        {canLinkToProfile && profileLink ? (
          <AppLink to={profileLink} className="shrink-0">
            <Avatar
              src={authorInfo?.avatar}
              username={authorInfo?.name ?? authorInfo?.username}
              size={48}
            />
          </AppLink>
        ) : (
          <Avatar
            src={authorInfo?.avatar}
            username={authorInfo?.name ?? authorInfo?.username}
            size={48}
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Header: name, handle, timestamp, more options */}
          <div className="flex items-center gap-2 mb-1">
            {renderName()}
            {formattedTime && (
              <span className="ml-auto text-foreground-muted text-[0.8rem] font-sans leading-none">
                {formattedTime}
              </span>
            )}
            <button
              className="ml-2 p-1 rounded-md text-foreground-muted hover:bg-surface transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Content with @mention links */}
          <p className="text-foreground font-sans text-xl leading-loose mb-3">
            {mentions.length > 0 ? (
              <>
                {mentions.reduce((acc, mention, index) => {
                  const before = content.slice(
                    index === 0 ? 0 : mentions[index - 1].end,
                    mention.start
                  );
                  return (
                    <>
                      {acc}
                      {before}
                      <AppLink
                        key={mention.username}
                        to={ROUTES.PROFILE(mention.username)}
                        className="text-cobalt hover:text-cobalt-hover font-medium"
                      >
                        {mention.text}
                      </AppLink>
                    </>
                  );
                }, null)}
                {content.slice(mentions[mentions.length - 1].end)}
              </>
            ) : (
              content
            )}
          </p>

          {/* Action row */}
          <div className="flex items-center gap-3">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-foreground-muted hover:bg-surface hover:text-cobalt transition-colors text-[0.8rem] font-medium"
              aria-label="Reply"
            >
              <MessageCircle size={16} strokeWidth={1.5} />
              <span>Reply</span>
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-foreground-muted hover:bg-surface hover:text-cobalt transition-colors text-[0.8rem] font-medium"
              aria-label="Retweet"
            >
              <RefreshCcw size={16} strokeWidth={1.5} />
              <span>Retweet</span>
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-foreground-muted hover:bg-surface hover:text-[#dc2626] transition-colors text-[0.8rem] font-medium"
              aria-label="Like"
            >
              <Heart size={16} strokeWidth={1.5} />
              <span>{stats.likes}</span>
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-foreground-muted hover:bg-surface hover:text-cobalt transition-colors text-[0.8rem] font-medium"
              aria-label="Bookmark"
            >
              <Bookmark size={16} strokeWidth={1.5} />
              <span>Bookmark</span>
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-foreground-muted hover:bg-surface hover:text-cobalt transition-colors text-[0.8rem] font-medium"
              aria-label="Share"
            >
              <Share2 size={16} strokeWidth={1.5} />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
