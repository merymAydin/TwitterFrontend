import { useState } from "react";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { AppLink } from "../ui/Link";
import { ROUTES } from "../../router";
import { useTweets } from "../../hooks/useTweets";
import { VerifiedBadge, isUserVerified } from "../users/VerifiedBadge";
import { cn } from "../../lib/utils";

const MAX_LENGTH = 280;

function getContent(tweet) {
  return tweet?.content ?? tweet?.text ?? tweet?.body ?? "";
}

function getAuthorInfo(tweet, usersById) {
  const author = tweet?.userId != null ? usersById[tweet.userId] : null;
  return {
    name: author?.username ?? (tweet?.userId != null ? `User ${tweet.userId}` : "Unknown"),
    verified: isUserVerified(author),
    avatar: author?.photo ?? null,
    userId: tweet?.userId,
  };
}

export function QuoteTweetModal({ tweet, onClose, onQuoted }) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const { quoteTweet, loadTweets } = useTweets();
  const usersById = useSelector((state) => state.users.byId);
  const authorInfo = getAuthorInfo(tweet, usersById);
  const originalContent = getContent(tweet);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const quoteContent = content.trim();
    if (!quoteContent || posting) return;

    setPosting(true);
    setError(null);
    try {
      const tweetId = tweet?.id ?? tweet?.statistics?.tweetId;
      await quoteTweet(tweetId, { content: quoteContent }).unwrap();
      setContent("");
      onClose();
      if (onQuoted) onQuoted();
      else loadTweets({ page: 0, size: 20 });
    } catch (err) {
      setError(
        typeof err === "string" ? err : err?.message || "Failed to quote tweet. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">Quote Tweet</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <Avatar src={null} username="You" size={40} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add your comment..."
                rows={3}
                maxLength={MAX_LENGTH}
                className="w-full resize-none bg-transparent py-1 leading-relaxed text-foreground outline-none placeholder:text-foreground-muted"
              />
            </div>
          </div>

          {/* Original tweet preview */}
          <div className="mt-3 ml-12 rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-2">
              <Avatar src={authorInfo.avatar} username={authorInfo.name} size={24} />
              <span className="text-small font-medium text-foreground">{authorInfo.name}</span>
              {authorInfo.verified && <VerifiedBadge size={14} />}
            </div>
            <p className="mt-1 text-small text-foreground leading-relaxed">{originalContent}</p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span
              className={cn(
                "text-[0.8rem]",
                content.length > MAX_LENGTH ? "text-[#DC2626]" : "text-foreground-muted"
              )}
            >
              {content.length}/{MAX_LENGTH}
            </span>
            <button
              type="submit"
              disabled={!content.trim() || posting || content.length > MAX_LENGTH}
              className="rounded-full bg-cobalt px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-cobalt-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting ? "Quoting…" : "Quote"}
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-2 text-sm text-[#DC2626]">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
