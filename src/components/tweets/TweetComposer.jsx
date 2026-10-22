import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTweets } from '../../hooks/useTweets';
import { aiService } from '../../api/aiService';
import { Avatar } from '../ui/Avatar';

const MAX_LENGTH = 280;

export function TweetComposer() {
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const { postTweet } = useTweets();

  const charCount = content.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const canPost = content.trim().length > 0 && !isOverLimit && !posting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canPost) return;

    setPosting(true);
    setError(null);
    try {
      // POST /tweet with { content } — matches the backend CreateTweetRequest contract.
      // unwrap() surfaces the rejected thunk payload so errors are catchable here.
      await postTweet({ content: content.trim() }).unwrap();
      setContent('');
      setError(null);
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : err?.message || 'Failed to post tweet. Please try again.'
      );
    } finally {
      setPosting(false);
    }
  };

  // Rewrite the current draft via POST /api/gemini/rewriteDraft { content, tone }.
  const handleRewrite = async () => {
    const draft = content.trim();
    if (!draft || rewriting || posting) return;

    setRewriting(true);
    setError(null);
    try {
      const result = await aiService.rewriteDraft({ content: draft });
      const text = typeof result === 'string' ? result.trim() : '';
      if (!text) {
        setError('The assistant returned an empty draft.');
      } else {
        setContent(text);
      }
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : err?.message || 'AI rewrite failed. Please try again.'
      );
    } finally {
      setRewriting(false);
    }
  };

  return (
    <div
      className="bg-white border border-border rounded-2xl p-4 shadow-sm"
      data-tour="Write your thoughts and hit Post to share your first tweet."
      data-tour-step="1"
      data-tour-title="Create a tweet"
    >
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-shrink-0">
          <Avatar src="" username="You" size={40} />
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            className="w-full min-h-[104px] resize-none bg-transparent px-2 pt-1 pb-2 leading-relaxed text-foreground outline-none"
            rows={4}
            maxLength={MAX_LENGTH}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`text-[0.75rem] ${
                  isOverLimit ? 'text-[#dc2626]' : 'text-foreground-muted'
                }`}
              >
                {charCount}/{MAX_LENGTH}
              </span>
              {isOverLimit && (
                <span className="text-[0.75rem] text-[#dc2626]">
                  {charCount - MAX_LENGTH} over limit
                </span>
              )}
              <button
                type="button"
                onClick={handleRewrite}
                disabled={!content.trim() || rewriting || posting}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[0.75rem] font-medium text-foreground-muted transition-colors hover:border-cobalt hover:text-cobalt disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={14} strokeWidth={1.8} />
                {rewriting ? 'Rewriting…' : 'Rewrite with AI'}
              </button>
            </div>
            {/* Post button — design from the provided reference (blue, pill,
                hover glow + scale, active press), implemented with Tailwind. */}
            <button
              type="submit"
              disabled={!canPost}
              className="shrink-0 rounded-full border-0 bg-[#2ba8fb] px-[30px] py-[12.5px] font-bold text-white transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2ba8fb] focus-visible:ring-offset-2 enabled:hover:scale-110 enabled:hover:bg-[#6fc5ff] enabled:hover:shadow-[0_0_20px_#6fc5ff50] enabled:active:scale-[0.98] enabled:active:bg-[#3d94cf] enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </form>
      {error && (
        <div className="mt-2 p-2 rounded-md bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

