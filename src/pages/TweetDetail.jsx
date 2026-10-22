import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { MessageCircle } from "lucide-react";
import { useTweets } from "../hooks/useTweets";
import { fetchComments, createComment } from "../store/slices/commentsSlice";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { AppLink } from "../components/ui/Link";
import { Tweet } from "../components/tweets/Tweet";
import { VerifiedBadge, isUserVerified } from "../components/users/VerifiedBadge";
import { ROUTES } from "../router";
import { cn } from "../lib/utils";

const MAX_LENGTH = 280;

export function TweetDetail() {
  const { id } = useParams();
  const tweetId = Number(id);
  const dispatch = useDispatch();
  const { currentTweet, loading, error, loadTweet } = useTweets();
  const { items: comments } = useSelector((state) => state.comments);
  const currentUser = useSelector((state) => state.auth.user);
  // Comments only carry a userId, so their authors are resolved from GET /users.
  const usersById = useSelector((state) => state.users.byId);

  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(null);
  const replyRef = useRef(null);

  useEffect(() => {
    if (id) loadTweet(id);
  }, [id, loadTweet]);

  // There is no per-tweet comment endpoint, so the full collection is loaded
  // once and filtered by tweetId below.
  useEffect(() => {
    dispatch(fetchComments());
  }, [dispatch]);

  const tweetComments = comments.filter((c) => Number(c.tweetId) === tweetId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || posting) return;

    setPosting(true);
    setPostError(null);
    try {
      await dispatch(createComment({ tweetId, content })).unwrap();
      setDraft("");
    } catch (err) {
      setPostError(
        typeof err === "string" ? err : err?.message || "Failed to post reply. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  // The hero tweet's Reply action focuses the composer below it.
  const focusReply = () => replyRef.current?.focus();

  if (loading && !currentTweet) return <Skeleton className="h-96 w-full" />;
  if (error && !currentTweet) {
    return <div className="mx-auto max-w-2xl py-20 text-center text-foreground-muted">{error}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-16">
      <PageHeader title="Post" description="Conversation" />

      {!currentTweet ? (
        <EmptyState
          title="Post not found"
          description="The post you're looking for doesn't exist."
        />
      ) : (
        <>
          <Tweet tweet={currentTweet} variant="detail" onReply={focusReply} />

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-medium text-foreground">Replies</h2>
              <span className="text-small text-foreground-muted">{tweetComments.length}</span>
            </div>

            {/* Composer and replies share one surface so the thread reads as a
                single continuous flow, right under the post. */}
            <div className="overflow-hidden rounded-2xl border border-border bg-white">
              <form onSubmit={handleSubmit} className="p-5">
                <div className="flex gap-3">
                  <Avatar
                    src={currentUser?.photo}
                    username={currentUser?.username ?? "You"}
                    size={40}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <textarea
                      ref={replyRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Post your reply"
                      rows={2}
                      maxLength={MAX_LENGTH}
                      className="min-h-[56px] w-full resize-none bg-transparent py-1 leading-relaxed text-foreground outline-none placeholder:text-foreground-muted"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[0.8rem]",
                          draft.length > MAX_LENGTH ? "text-[#DC2626]" : "text-foreground-muted"
                        )}
                      >
                        {draft.length}/{MAX_LENGTH}
                      </span>
                      <button
                        type="submit"
                        disabled={!draft.trim() || posting}
                        className="rounded-full bg-cobalt px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-cobalt-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {posting ? "Replying…" : "Reply"}
                      </button>
                    </div>
                  </div>
                </div>
                {postError && (
                  <div className="mt-3 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-2 text-sm text-[#DC2626]">
                    {postError}
                  </div>
                )}
              </form>

              {tweetComments.length === 0 ? (
                <div className="border-t border-border px-5 py-12 text-center">
                  <MessageCircle
                    size={22}
                    strokeWidth={1.5}
                    className="mx-auto text-foreground-muted"
                  />
                  <p className="mt-3 text-body text-foreground">No replies yet</p>
                  <p className="mt-1 text-small text-foreground-muted">
                    Start the conversation by posting a reply.
                  </p>
                </div>
              ) : (
                <ul
                  className="divide-y divide-border border-t border-border"
                  role="list"
                >
                  {tweetComments.map((comment) => {
                    const author = usersById[comment.userId];
                    const name = author?.username ?? `User ${comment.userId}`;
                    const link =
                      comment.userId != null ? ROUTES.PROFILE(comment.userId) : null;
                    return (
                      <li key={comment.commentId} className="flex items-start gap-3 p-5">
                        {link ? (
                          <AppLink to={link} className="flex shrink-0">
                            <Avatar src={author?.photo} username={name} size={40} />
                          </AppLink>
                        ) : (
                          <Avatar src={author?.photo} username={name} size={40} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {link ? (
                              <AppLink
                                to={link}
                                className="text-small font-medium text-foreground transition-colors hover:text-cobalt"
                              >
                                {name}
                              </AppLink>
                            ) : (
                              <span className="text-small font-medium text-foreground">{name}</span>
                            )}
                            {isUserVerified(author) && <VerifiedBadge size={14} />}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap break-words text-body leading-relaxed text-foreground">
                            {comment.content}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

