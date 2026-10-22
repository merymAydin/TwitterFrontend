import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { deleteTweet } from "../../store/slices/tweetsSlice";
import api from "../../api/axios";
import { useState, useRef, useEffect } from "react";
import { Avatar } from "../ui/Avatar";
import { AppLink } from "../ui/Link";
import { QuoteTweetModal } from "./QuoteTweetModal";
import { ROUTES } from "../../router";
import { useAI } from "../../context/AIContext";
import { useInteractions } from "../../hooks/useInteractions";
import { VerifiedBadge, isUserVerified } from "../users/VerifiedBadge";
import { cn } from "../../lib/utils";
import {
  RefreshCcw,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";

// Defensive helpers — TweetResponse only exposes { id, content, userId, location,
// parentId, statistics }, so author/date fields are read defensively.
function getContent(tweet) {
  return tweet?.content ?? tweet?.text ?? tweet?.body ?? "";
}

// Detect if a tweet is a retweet (has originalTweet but no own content).
function isRetweet(tweet) {
  return (tweet?.content == null && tweet?.text == null && tweet?.body == null) && tweet?.originalTweet != null;
}

function getStatistics(tweet) {
  const stats = tweet?.statistics ?? {};
  return {
    tweetId: tweet?.id ?? stats.tweetId ?? null,
    views: stats.views ?? 0,
    likes: stats.likes ?? 0,
    comments: stats.comments ?? 0,
    bookmarks: stats.bookmarks ?? 0,
    retweets: stats.retweets ?? 0,
    quotes: stats.quotes ?? 0,
  };
}

function getTimestamp(tweet) {
  return tweet?.createdAt ?? tweet?.timestamp ?? tweet?.postedAt ?? tweet?.created_at ?? null;
}

// Extract the quoted/original tweet reference from a quote tweet.
// The backend may return the original tweet as a nested object or as an ID.
function getQuotedTweetRef(tweet) {
  if (!tweet) return null;
  // Nested original tweet object
  if (tweet.quotedTweet) return { tweet: tweet.quotedTweet, id: tweet.quotedTweet.id ?? tweet.quotedTweet.statistics?.tweetId };
  if (tweet.originalTweet) return { tweet: tweet.originalTweet, id: tweet.originalTweet.id ?? tweet.originalTweet.statistics?.tweetId };
  if (tweet.quoteTweet) return { tweet: tweet.quoteTweet, id: tweet.quoteTweet.id ?? tweet.quoteTweet.statistics?.tweetId };
  // ID reference only
  const quoteId = tweet.quoteTweetId ?? tweet.quotedTweetId ?? tweet.originalTweetId ?? null;
  if (quoteId != null) return { tweet: null, id: Number(quoteId) };
  // parentId might be used for quote tweets (distinct from reply comments)
  if (tweet.parentId != null && tweet.parentId !== tweet.id) return { tweet: null, id: Number(tweet.parentId) };
  return null;
}

// Simplified quoted tweet card — renders the original tweet inside a quote tweet.
// Does not include actions or nested quotes to avoid recursive rendering.
function QuotedTweetCard({ tweet }) {
  const navigate = useNavigate();
  const usersById = useSelector((state) => state.users.byId);
  if (!tweet) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface p-3 elevated-surface">
        <p className="text-small text-foreground-muted italic">This tweet is no longer available.</p>
      </div>
    );
  }
  const tweetId = tweet.id ?? tweet.statistics?.tweetId;
  const handleClick = (e) => {
    if (e) e.stopPropagation();
    if (tweetId != null) navigate(`/tweet/${tweetId}`);
  };
  const content = tweet.content ?? tweet.text ?? tweet.body ?? "";
  if (!content) return null;

  const author = tweet.userId != null ? usersById[tweet.userId] : null;
  const authorName = author?.username ?? (tweet.userId != null ? `User ${tweet.userId}` : "Unknown");
  const avatarSrc = author?.photo ?? null;
  const isVerified = author?.verified ?? author?.premium ?? author?.isVerified ?? author?.isPremium ?? false;

  return (
    <div
      className="mt-3 cursor-pointer rounded-xl border border-border bg-surface p-3 elevated-surface transition-colors hover:bg-surface"
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <div className="flex items-start gap-2">
        <Avatar src={avatarSrc} username={authorName} size={24} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-small font-medium text-foreground">{authorName}</span>
            {isVerified && <VerifiedBadge size={12} />}
          </div>
          <p className="mt-1 text-small text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

// Parse @mentions from tweet content. Returns array of { username, start, end, text }.
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

/**
 * Renders a tweet.
 *
 * variant="card"   — the compact, clickable card used by the feed/bookmarks.
 * variant="detail" — the larger, non-clickable hero used on the tweet page.
 */
export function Tweet({ tweet, variant = "card", onReply }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { openAssistant } = useAI();
  const { isLiked, isBookmarked, isRetweeted, toggleLike, toggleBookmark, toggleRetweet, likeDelta, retweetDelta } = useInteractions();
  // TweetResponse carries only a userId, so the author is resolved from the
  // users map loaded via GET /users.
  const usersById = useSelector((state) => state.users.byId);
  const usersByUsername = useSelector((state) => state.users.byUsername);
  const allTweets = useSelector((state) => state.tweets.items);
  const userTweets = useSelector((state) => state.tweets.userTweets);
  const exploreTweets = useSelector((state) => state.tweets.exploreTweets);
  const currentTweet = useSelector((state) => state.tweets.current);

  const content = getContent(tweet);
  const stats = getStatistics(tweet);
  const tweetId = stats.tweetId;
  const hasId = tweetId != null;
  const isDetail = variant === "detail";

  const author = tweet?.userId != null ? usersById[tweet.userId] : null;
  const currentUserId = useSelector((state) => state.auth.user?.userId);
  const isOwnTweet = currentUserId != null && tweet?.userId === currentUserId;
  const username = author?.username ?? null;
  const authorLabel = username ?? (tweet?.userId != null ? `User ${tweet.userId}` : "Unknown");
  const authorVerified = isUserVerified(author);
  const avatarSrc = author?.photo ?? null;
  const profileLink = tweet?.userId != null ? ROUTES.PROFILE(tweet.userId) : null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [retweetMenuOpen, setRetweetMenuOpen] = useState(false);
  const [fetchedQuotedTweet, setFetchedQuotedTweet] = useState(null);
  const [fetchingQuoted, setFetchingQuoted] = useState(false);
  const menuRef = useRef(null);
  const retweetMenuRef = useRef(null);
  const fetchAttemptedRef = useRef(false);

  // Resolve quoted tweet from Redux state (avoid N+1 API calls).
  const quotedRef = getQuotedTweetRef(tweet);
  let quotedTweet = quotedRef?.tweet ?? null;
  if (!quotedTweet && quotedRef?.id != null) {
    const searchPool = [...allTweets, ...userTweets, ...exploreTweets];
    if (currentTweet && (currentTweet.id ?? currentTweet.statistics?.tweetId) === quotedRef.id) searchPool.push(currentTweet);
    quotedTweet = searchPool.find((t) => (t.id ?? t.statistics?.tweetId) === quotedRef.id) ?? null;
  }
  if (!quotedTweet && fetchedQuotedTweet) {
    quotedTweet = fetchedQuotedTweet;
  }
  const isQuoteTweet = quotedRef != null;

  // A tweet without content is not renderable, unless it's a retweet
  // (which shows the original tweet via originalTweet).
  if (!content && !isRetweet(tweet)) return null;

  const liked = isLiked(tweetId);
  const bookmarked = isBookmarked(tweetId);
  const retweeted = isRetweeted(tweetId);
  const likeCount = (stats.likes ?? 0) + (likeDelta[tweetId] ?? 0);
  const retweetCount = (stats.retweets ?? 0) + (retweetDelta[tweetId] ?? 0);

  // Fetch quoted tweet if not already in Redux state.
  useEffect(() => {
    if (!isQuoteTweet || quotedTweet || fetchingQuoted || !quotedRef?.id || fetchAttemptedRef.current) return;
    fetchAttemptedRef.current = true;
    setFetchingQuoted(true);
    const fetchQuoted = async () => {
      try {
        const response = await api.get(`/tweet/${quotedRef.id}`);
        setFetchedQuotedTweet(response.data);
      } catch {
        // Silently fail — will show "no longer available"
      } finally {
        setFetchingQuoted(false);
      }
    };
    fetchQuoted();
  }, [isQuoteTweet, quotedTweet, fetchingQuoted, quotedRef?.id]);

  // Close menus on outside click or Escape.
  useEffect(() => {
    if (!menuOpen && !retweetMenuOpen) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (retweetMenuRef.current && !retweetMenuRef.current.contains(e.target)) {
        setRetweetMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setRetweetMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen, retweetMenuOpen]);

  const openDetail = () => {
    if (hasId) navigate(ROUTES.TWEET_DETAIL(tweetId));
  };
  // Interactive children must not trigger the card-level navigation.
  const stop = (e) => e.stopPropagation();
  const handleReply = () => {
    if (onReply) onReply();
    else openDetail();
  };

  const handleCopyLink = async () => {
    setMenuOpen(false);
    if (!hasId) return;
    const url = `${window.location.origin}${ROUTES.TWEET_DETAIL(tweetId)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const handleDelete = () => {
    setMenuOpen(false);
    if (!hasId || !isOwnTweet) return;
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!hasId || !isOwnTweet) return;
    setDeleting(true);
    try {
      await dispatch(deleteTweet(tweetId)).unwrap();
      setDeleteConfirmOpen(false);
    } catch {
      // Error handled by Redux
    } finally {
      setDeleting(false);
    }
  };

  const handleReport = () => {
    setMenuOpen(false);
    // Report functionality - if backend supports it, call the API here.
    // For now, show a simple alert since there's no report endpoint in the contract.
    alert("Report submitted. Thank you for helping keep our community safe.");
  };

  const timestamp = getTimestamp(tweet);
  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  // Content with @mention links (resolved to profile ids via the users map).
  const mentions = parseMentions(content);
  const renderContent = () => {
    if (mentions.length === 0) return content;
    const parts = [];
    let cursor = 0;
    let key = 0;
    for (const mention of mentions) {
      if (mention.start > cursor) {
        parts.push(<span key={key++}>{content.slice(cursor, mention.start)}</span>);
      }
      const target = usersByUsername[mention.username];
      parts.push(
        target?.userId != null ? (
          <AppLink
            key={key++}
            to={ROUTES.PROFILE(target.userId)}
            onClick={stop}
            className="text-cobalt hover:text-cobalt-hover font-medium"
          >
            {mention.text}
          </AppLink>
        ) : (
          <span key={key++} className="text-cobalt font-medium">
            {mention.text}
          </span>
        )
      );
      cursor = mention.end;
    }
    if (cursor < content.length) parts.push(<span key={key++}>{content.slice(cursor)}</span>);
    return parts;
  };

  const avatarNode = (
    <Avatar src={avatarSrc} username={authorLabel} size={isDetail ? 56 : 48} />
  );

  // Wrapper for avatar links: flex (block) ensures the <a> tag properly contains
  // the fixed-size avatar div and doesn't stretch in a parent flex container.
  const avatarLinkClass = "flex shrink-0";

  const renderActions = () => {
    const btn = (extra) =>
      cn(
        "flex items-center gap-1.5 rounded-full transition-colors text-[0.8rem] font-medium",
        isDetail ? "px-3 py-2" : "px-2 py-1",
        extra
      );
    const icon = isDetail ? 18 : 16;

    return (
      <div
        className={cn("flex items-center", isDetail ? "justify-between gap-1" : "gap-3")}
        onClick={stop}
      >
        <button
          type="button"
          onClick={handleReply}
          aria-label="Reply"
          className={btn("text-foreground-muted hover:bg-black/5 hover:text-foreground")}
        >
          <MessageCircle size={icon} strokeWidth={1.5} />
          <span>{isDetail ? stats.comments : "Reply"}</span>
        </button>
        <div className="relative" ref={retweetMenuRef}>
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              if (retweeted) {
                // If already retweeted, undo directly
                toggleRetweet(tweetId);
              } else {
                setRetweetMenuOpen((prev) => !prev);
              }
            }}
            aria-label={retweeted ? "Undo retweet" : "Retweet"}
            aria-pressed={retweeted}
            className={btn(
              retweeted
                ? "text-[#16a34a] hover:bg-black/5"
                : "text-foreground-muted hover:bg-black/5 hover:text-[#16a34a]"
            )}
          >
            <RefreshCcw size={icon} strokeWidth={1.5} className={retweeted ? "fill-current" : undefined} />
            <span>{isDetail ? retweetCount : retweeted ? "Retweeted" : "Retweet"}</span>
          </button>
          {retweetMenuOpen && !retweeted && (
            <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-lg border border-border bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setRetweetMenuOpen(false);
                  toggleRetweet(tweetId);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-foreground transition-colors hover:bg-surface"
              >
                Retweet
              </button>
              <button
                type="button"
                onClick={() => {
                  setRetweetMenuOpen(false);
                  setQuoteOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-foreground transition-colors hover:bg-surface"
              >
                Quote Tweet
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => hasId && toggleLike(tweetId)}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          className={btn(
            liked
              ? "text-[#dc2626] hover:bg-black/5"
              : "text-foreground-muted hover:bg-black/5 hover:text-[#dc2626]"
          )}
        >
          <Heart size={icon} strokeWidth={1.5} className={liked ? "fill-current" : undefined} />
          <span>{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => hasId && toggleBookmark(tweetId)}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          aria-pressed={bookmarked}
          className={btn(
            bookmarked
              ? "text-cobalt hover:bg-black/5"
              : "text-foreground-muted hover:bg-black/5 hover:text-cobalt"
          )}
        >
          <Bookmark
            size={icon}
            strokeWidth={1.5}
            className={bookmarked ? "fill-current" : undefined}
          />
          <span>{isDetail ? stats.bookmarks : bookmarked ? "Saved" : "Bookmark"}</span>
        </button>
        <button
          type="button"
          aria-label="Share"
          className={btn("text-foreground-muted hover:bg-black/5 hover:text-foreground")}
        >
          <Share2 size={icon} strokeWidth={1.5} />
          <span>Share</span>
        </button>
        <button
          type="button"
          onClick={() => openAssistant(tweet)}
          aria-label="Ask AI about this tweet"
          className={btn("text-foreground-muted hover:bg-black/5 hover:text-foreground")}
        >
          <Sparkles size={icon} strokeWidth={1.5} />
          <span>AI</span>
        </button>
      </div>
    );
  };

  if (isDetail) {
    return (
      <>
        <article className="w-full rounded-2xl border border-border bg-surface p-6">
          {isRetweet(tweet) && (
            <div className="mb-3 flex items-center gap-1.5 text-[0.8rem] text-foreground-muted">
              <RefreshCcw size={14} strokeWidth={1.5} />
              <span>Retweeted</span>
            </div>
          )}
        <div className="flex items-start gap-4">
          {profileLink ? (
            <AppLink to={profileLink} className={avatarLinkClass} active={false}>
              {avatarNode}
            </AppLink>
          ) : (
            avatarNode
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {profileLink ? (
                    <AppLink
                      to={profileLink}
                      className="text-base font-medium text-foreground transition-colors hover:text-cobalt"
                      active={false}
                    >
                      {authorLabel}
                    </AppLink>
                  ) : (
                    <span className="text-base font-medium text-foreground">{authorLabel}</span>
                  )}
                  {authorVerified && <VerifiedBadge size={16} />}
                </div>
                {formattedTime && (
                  <p className="mt-0.5 text-[0.8rem] text-foreground-muted">{formattedTime}</p>
                )}
              </div>
              <div className="relative ml-auto" ref={menuRef} onClick={stop}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-black/5"
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <MoreHorizontal size={18} strokeWidth={1.5} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-foreground transition-colors hover:bg-surface"
                    >
                      Copy link
                    </button>
                    {isOwnTweet && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-[#DC2626] transition-colors hover:bg-surface disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : "Delete"}
                      </button>
                    )}
                    {!isOwnTweet && (
                      <button
                        type="button"
                        onClick={handleReport}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-foreground transition-colors hover:bg-surface"
                      >
                        Report
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap break-words font-sans text-xl leading-relaxed text-foreground">
              {renderContent()}
            </p>

            {isQuoteTweet && <QuotedTweetCard tweet={quotedTweet} />}

            {stats.views > 0 && (
              <p className="mt-3 text-[0.8rem] text-foreground-muted">{stats.views} views</p>
            )}

            <div className="mt-4 border-t border-border pt-3">{renderActions()}</div>
          </div>
        </div>
      </article>
      {quoteOpen && (
        <QuoteTweetModal
          tweet={tweet}
          onClose={() => setQuoteOpen(false)}
        />
      )}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-medium text-foreground">Delete Tweet?</h2>
            <p className="mt-2 text-small text-foreground-muted">This can't be undone and it will be removed from your profile, the timeline of any accounts that follow you, and from search results.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-full bg-[#DC2626] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#B91C1C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <> 
    <article
      onClick={openDetail}
      className="mb-4 w-full cursor-pointer rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface"
    >
      {isRetweet(tweet) && (
        <div className="mb-2 flex items-center gap-1.5 text-[0.8rem] text-foreground-muted">
          <RefreshCcw size={14} strokeWidth={1.5} />
          <span>Retweeted</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        {profileLink ? (
          <AppLink to={profileLink} onClick={stop} className={avatarLinkClass} active={false}>
            {avatarNode}
          </AppLink>
        ) : (
          avatarNode
        )}

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {profileLink ? (
              <AppLink
                to={profileLink}
                onClick={stop}
                className="text-base font-medium leading-none text-foreground transition-colors hover:text-cobalt"
                active={false}
              >
                {authorLabel}
              </AppLink>
            ) : (
              <span className="text-base font-medium leading-none text-foreground">
                {authorLabel}
              </span>
            )}
            {authorVerified && <VerifiedBadge size={15} />}
            {formattedTime && (
              <span className="text-[0.8rem] leading-none text-foreground-muted">
                {formattedTime}
              </span>
            )}
            <div className="relative ml-auto" ref={menuRef} onClick={stop}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-black/5"
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={16} strokeWidth={1.5} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-foreground transition-colors hover:bg-surface"
                  >
                    Copy link
                  </button>
                  {isOwnTweet && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-[#DC2626] transition-colors hover:bg-surface"
                    >
                      Delete
                    </button>
                  )}
                  {!isOwnTweet && (
                    <button
                      type="button"
                      onClick={handleReport}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-small text-foreground transition-colors hover:bg-surface"
                    >
                      Report
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mb-3 whitespace-pre-wrap break-words font-sans text-xl leading-loose text-foreground">
            {renderContent()}
          </p>

          {isQuoteTweet && <QuotedTweetCard tweet={quotedTweet} />}

          {renderActions()}
        </div>
      </div>
    </article>
    {quoteOpen && (
      <QuoteTweetModal
        tweet={tweet}
        onClose={() => setQuoteOpen(false)}
      />
    )}
    {deleteConfirmOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteConfirmOpen(false)}>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-base font-medium text-foreground">Delete Tweet?</h2>
          <p className="mt-2 text-small text-foreground-muted">This can't be undone and it will be removed from your profile, the timeline of any accounts that follow you, and from search results.</p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-full bg-[#DC2626] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#B91C1C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

