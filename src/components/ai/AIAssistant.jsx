import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAI } from '../../context/AIContext';
import { aiService } from '../../api/aiService';

/*
 * AI Assistant floating widget.
 *
 * Visual design adapted from the original React + styled-components "AI Input"
 * source (rotating four-colour blur balls, the blinking eyes character, the
 * hover "happy eyes", the 3D tilt that follows the pointer, and the gradient
 * send button), re-implemented with React + Tailwind — no styled-components.
 *
 * Backend contract: the only supported chat endpoint is
 * `POST /api/gemini/chat` which takes a RAW plain-text body and returns a plain
 * string (see GeminiController.chat). It has no tweet-context field, so when a
 * tweet is selected its content is added to the prompt text client-side — no
 * request field is invented and the Axios/JWT setup is untouched. A cleaner
 * long-term fix is a dedicated backend DTO (e.g. ChatRequest{ message, tweetId })
 * where the server loads the tweet and builds the context itself.
 */

/* ── Visual building blocks ─────────────────────────────────────────────── */

// Four coloured blur balls arranged in a cross, exactly as in the source:
// violet (top), green (bottom), rosa/pink (left), cyan (right).
const AI_BALLS = [
  { position: 'left-1/2 top-0 -translate-x-1/2', color: '#9147ff' },
  { position: 'left-1/2 bottom-0 -translate-x-1/2', color: '#34d399' },
  { position: 'top-1/2 left-0 -translate-y-1/2', color: '#ec4899' },
  { position: 'top-1/2 right-0 -translate-y-1/2', color: '#05e0f5' },
];

// The original smiley-eye SVG path, reused for the "happy eyes" state.
const SMILEY_PATH =
  'M8.28386 16.2843C8.9917 15.7665 9.8765 14.731 12 14.731C14.1235 14.731 15.0083 15.7665 ' +
  '15.7161 16.2843C17.8397 17.8376 18.7542 16.4845 18.9014 15.7665C19.4323 13.1777 17.6627 ' +
  '11.1066 17.3088 10.5888C16.3844 9.23666 14.1235 8 12 8C9.87648 8 7.61556 9.23666 6.69122 ' +
  '10.5888C6.33728 11.1066 4.56771 13.1777 5.09858 15.7665C5.24582 16.4845 6.16034 17.8376 ' +
  '8.28386 16.2843Z';

// `blur` scales with the balls so the smaller character keeps the same soft look.
function BlurBalls({ slow = false, ballSize = 72, blur = 30 }) {
  return (
    <div className={`absolute inset-[-18%] ${slow ? 'ai-balls-slow' : 'ai-balls'}`}>
      {AI_BALLS.map((ball) => (
        <span
          key={ball.color}
          className={`absolute rounded-full ${ball.position}`}
          style={{
            backgroundColor: ball.color,
            width: ballSize,
            height: ballSize,
            filter: `blur(${blur}px)`,
          }}
        />
      ))}
    </div>
  );
}

// The character's eyes: two blinking white pills, swapping to happy eyes on hover.
function CharacterEyes() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="flex items-center justify-center gap-[18px] transition-opacity duration-300 group-hover:opacity-0">
        <span className="ai-eye ai-eye-white h-[30px] w-[15px] rounded-[10px] shadow-[0_2px_18px_rgba(0,0,0,0.18)]" />
        <span className="ai-eye ai-eye-white h-[30px] w-[15px] rounded-[10px] shadow-[0_2px_18px_rgba(0,0,0,0.18)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <svg className="w-[34px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path fill="currentColor" d={SMILEY_PATH} />
        </svg>
        <svg className="w-[34px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path fill="currentColor" d={SMILEY_PATH} />
        </svg>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function getTweetText(tweet) {
  return tweet?.content ?? tweet?.text ?? tweet?.body ?? '';
}

function getTweetId(tweet) {
  return tweet?.statistics?.tweetId ?? tweet?.id ?? null;
}

// Builds the prompt sent to the (stateless, context-free) chat endpoint so the
// assistant knows which tweet the user is asking about. The tweet content is
// embedded in the message text — no unsupported request field is added.
function buildContextPrompt(tweet, message) {
  const content = getTweetText(tweet);
  if (!content) return message;
  const id = getTweetId(tweet);
  const idPart = id != null ? ` (tweet id: ${id})` : '';
  return (
    `The user is asking about a specific tweet${idPart}.\n` +
    `Tweet content:\n"""${content}"""\n\n` +
    `Answer the user's request about this tweet.\n` +
    `User: ${message}`
  );
}

/* ── Main widget ────────────────────────────────────────────────────────── */

export function AIAssistant() {
  const { isOpen, selectedTweet, openAssistant, closeAssistant, clearContext } = useAI();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, hover: false });

  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  // The active tweet context, only when the tweet actually carries text.
  const contextTweet = getTweetText(selectedTweet) ? selectedTweet : null;

  // Keep the latest message in view.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  // Focus the input when the panel opens.
  useEffect(() => {
    if (isOpen) textareaRef.current?.focus();
  }, [isOpen]);

  // 3D tilt that follows the pointer (source: the 5×3 hover-zone rotation).
  const handlePointerMove = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const scale = isOpen ? 0.5 : 1;
      setTilt({
        rx: (0.5 - y) * 30 * scale,
        ry: (x - 0.5) * 30 * scale,
        hover: true,
      });
    },
    [isOpen],
  );

  const handlePointerLeave = useCallback(() => {
    setTilt({ rx: 0, ry: 0, hover: false });
  }, []);

  const handleSend = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const text = input.trim();
      if (!text || isTyping) return;

      setMessages((prev) => [...prev, { role: 'user', text }]);
      setInput('');
      setIsTyping(true);

      try {
        // Tweet context travels inside the message (supported contract); it is
        // never shown as a regular user message in the history.
        const prompt = contextTweet ? buildContextPrompt(contextTweet, text) : text;
        const reply = await aiService.chat({ message: prompt });
        const replyText = typeof reply === 'string' ? reply.trim() : '';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: replyText || 'No response.' },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'Something went wrong while reaching the assistant. Please try again.',
            failed: true,
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [input, isTyping, contextTweet],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(e);
      }
    },
    [handleSend],
  );

  const transform = `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${
    tilt.hover ? 45 : 0
  }px)`;

  return (
    <div className="fixed bottom-6 right-6 z-50 [perspective:1000px]">
      <div
        className="group relative"
        onMouseMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        style={{
          transform,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.35s ease-out',
        }}
      >
        {!isOpen && (
          /* ── The AI character (closed state) ─────────────────────────── */
          <button
            type="button"
            onClick={() => openAssistant(null)}
            aria-label="Open AI assistant"
            className="relative block h-[96px] w-[96px] cursor-pointer overflow-hidden rounded-[28px] bg-surface-elevated/55 shadow-[0_10px_40px_rgba(0,0,60,0.25)] transition-transform duration-300 group-hover:scale-[1.03]"
          >
            <BlurBalls ballSize={42} blur={24} />
            <div className="absolute inset-0 bg-background/10 backdrop-blur-[18px]" />
            <div className="relative z-10 h-full w-full p-3">
              <CharacterEyes />
            </div>
          </button>
        )}

        {isOpen && (
          /* ── The chat panel (open state) ─────────────────────────────── */
          <div className="relative h-[560px] w-[410px] max-h-[calc(100dvh_-_3rem)] max-w-[calc(100vw_-_2rem)] overflow-hidden rounded-[34px] bg-surface-elevated/50 shadow-[0_20px_60px_rgba(0,0,60,0.3)]">
            <BlurBalls slow ballSize={92} />
            <div className="absolute inset-0 bg-background/20 backdrop-blur-[26px]" />

            <div className="relative z-10 h-full w-full p-[7px]">
              <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-surface-elevated/90 ring-1 ring-border backdrop-blur-[18px]">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/5">
                      <span className="h-2 w-2 rounded-full bg-gradient-to-br from-[#9147ff] to-[#05e0f5]" />
                    </span>
                    <span className="text-xs font-medium text-foreground-muted">
                      AI Assistant
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={closeAssistant}
                    aria-label="Close assistant"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>

                {/* Active tweet context — sits directly below the header so it
                    stays above every conversation message. The tweet itself is
                    never a chat message. */}
                {contextTweet && (
                  <div className="mx-3 mt-1 mb-2 flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-surface/70 px-2.5 py-1.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-[#ec4899] to-[#9147ff]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                        Working with this tweet
                      </div>
                      <div className="truncate text-[11px] text-foreground-muted/80">
                        “{getTweetText(contextTweet)}”
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearContext}
                      aria-label="Clear tweet context"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                )}

                {/* Messages — the only scrollable region */}
                <div
                  ref={messagesRef}
                  className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
                >
                  {messages.length === 0 && !isTyping && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-b from-[#ec4899] via-[#9147ff] to-[#05e0f5] shadow-[0_8px_24px_rgba(145,71,255,0.35)]">
                        <svg className="w-8 text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path fill="currentColor" d={SMILEY_PATH} />
                        </svg>
                      </div>
                      <p className="text-[13px] font-medium text-foreground">Ask me anything</p>
                      <p className="mt-1 max-w-[16rem] text-[11px] text-foreground-muted">
                        {contextTweet
                          ? 'I can help you with this tweet.'
                          : 'Start a conversation with your AI assistant.'}
                      </p>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`ai-rise flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3 py-2 text-[13.5px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'rounded-br-md bg-foreground text-background'
                            : msg.failed
                              ? 'rounded-bl-md border border-red-200 bg-red-50 text-red-600'
                              : 'rounded-bl-md border border-border bg-surface/90 text-foreground'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex items-center gap-2 px-1 py-1">
                      <span className="ai-eye h-3 w-[9px] rounded-full bg-[#9147ff]" />
                      <span className="ai-eye h-3 w-[9px] rounded-full bg-[#ec4899]" />
                      <span className="ai-eye h-3 w-[9px] rounded-full bg-[#05e0f5]" />
                    </div>
                  )}
                </div>

                {/* Input — pinned to the bottom of the panel */}
                <form onSubmit={handleSend} className="shrink-0 px-3 pt-1 pb-3">
                  <div className="flex items-end gap-2 rounded-[22px] bg-surface/80 p-1.5 ring-1 ring-border shadow-[inset_0_1px_4px_rgba(0,0,0,0.06)]">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      placeholder="Imagine Something...✦˚"
                      className="max-h-24 w-full resize-none bg-transparent px-2.5 py-2 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-foreground-muted/50"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      aria-label="Send message"
                      className="group/send flex shrink-0 items-center justify-center rounded-[10px] p-[2px] opacity-70 shadow-[inset_0_6px_2px_-4px_rgba(255,255,255,0.5)] transition-all duration-150 enabled:cursor-pointer enabled:hover:opacity-100 enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        backgroundImage:
                          'linear-gradient(to top, #ff4141, #9147ff, #3b82f6)',
                      }}
                    >
                      <i className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-black/10 text-[#cfcfcf] backdrop-blur-[3px] transition-all duration-300 group-hover/send:text-[#f3f6fd] group-hover/send:[filter:drop-shadow(0_0_5px_rgba(255,255,255,0.9))]">
                        <svg viewBox="0 0 512 512" className="h-4 w-4" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M473 39.05a24 24 0 0 0-25.5-5.46L47.47 185h-.08a24 24 0 0 0 1 45.16l.41.13l137.3 58.63a16 16 0 0 0 15.54-3.59L422 80a7.07 7.07 0 0 1 10 10L226.66 310.26a16 16 0 0 0-3.59 15.54l58.65 137.38c.06.2.12.38.19.57c3.2 9.27 11.3 15.81 21.09 16.25h1a24.63 24.63 0 0 0 23-15.46L478.39 64.62A24 24 0 0 0 473 39.05"
                          />
                        </svg>
                      </i>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

