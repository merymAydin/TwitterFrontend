import { useCallback, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { PiixPal } from "piixpal/react";
import { ROUTES } from "../../router";

/*
 * Scout-powered onboarding.
 *
 * PiixPal's React wrapper does not forward refs, so the custom element is
 * reached through its own DOM node. The tour itself is fully driven by the
 * data-tour / data-tour-step / data-tour-title attributes in the real UI:
 * Scout's ctl.start() discovers them (ordered by data-tour-step), and
 * ctl.next()/back()/end() are handled by the library's own card.
 *
 * The ten stops all live on Home: the composer, the first feed card (timeline,
 * reply, retweet/quote, like/bookmark) and the persistent chrome (search,
 * Explore / Profile / Notifications entries, the sidebar itself). Pages that
 * live on other routes are introduced through those sidebar entries, so the
 * tour never navigates on its own.
 *
 * Completion is stored per user so the tour auto-runs on the first visit only.
 * Skipping and finishing both count as "seen"; the sidebar button can always
 * start it again.
 */

const STORAGE_PREFIX = "tweet-tour:v1:";
const SCOUT_SELECTOR = 'piix-pal[pal="scout"]';
const COMPOSER_SELECTOR = '[data-tour-step="1"]';
const TWEET_SELECTOR = '[data-tour-step="2"]';
const SEARCH_SELECTOR = '[data-tour-step="4"]';

function readCompletion(key) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markCompleted(key) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Private mode / storage disabled: the tour simply stays available.
  }
}

function waitFor(predicate, timeout = 5000, interval = 120) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      const value = predicate();
      if (value) {
        resolve(value);
        return;
      }
      if (Date.now() - startedAt >= timeout) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, interval);
    };
    tick();
  });
}

// The tour card lives in PiixPal's open shadow root. A small style layer keeps
// it in the app's palette/typography without changing any library behaviour.
function applyTourTheme() {
  try {
    const uiHost = document.querySelector("[data-piixpal-ui]");
    const shadow = uiHost?.shadowRoot;
    if (!uiHost || !shadow) return;

    uiHost.dataset.theme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

    if (shadow.getElementById("tweet-onboarding-theme")) return;

    const style = document.createElement("style");
    style.id = "tweet-onboarding-theme";
    style.textContent = `
      :host {
        --tt-font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        --tt-bg: #FFFFFF;
        --tt-fg: #1A1A1A;
        --tt-muted: #57534E;
        --tt-border: #E7E5E4;
        --tt-accent: #1D4ED8;
        --tt-accent-hover: #1E40AF;
      }
      :host([data-theme="dark"]) {
        --tt-bg: #22252D;
        --tt-fg: #E8EAF0;
        --tt-muted: #A1A5B2;
        --tt-border: #383C47;
        --tt-accent: #3B82F6;
        --tt-accent-hover: #2563EB;
      }
      .card {
        background: var(--tt-bg);
        color: var(--tt-fg);
        padding: 16px 18px;
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, .18), 0 0 0 1px var(--tt-border);
        font: 400 14px/1.55 var(--tt-font);
      }
      .card.tip::after { display: none; }
      .card h4 {
        margin-bottom: 8px;
        color: var(--tt-muted);
        font: 600 11px/1.2 var(--tt-font);
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .card b {
        display: block;
        margin-bottom: 4px !important;
        color: var(--tt-fg);
        font: 600 15px/1.35 var(--tt-font);
      }
      .card p { color: var(--tt-muted); font: 400 14px/1.55 var(--tt-font); }
      .card .row { margin-top: 16px; gap: 8px; }
      .card button,
      .card a.b {
        padding: 10px 16px;
        border-radius: 999px;
        background: var(--tt-accent);
        color: #fff;
        font: 600 13px/1 var(--tt-font);
        box-shadow: none;
        cursor: pointer;
        transition: background-color .15s, transform .08s;
      }
      .card button:hover { background: var(--tt-accent-hover); }
      .card button.ghost {
        background: transparent;
        color: var(--tt-muted);
        box-shadow: inset 0 0 0 1px var(--tt-border);
      }
      .card button.ghost:hover { background: var(--tt-border); color: var(--tt-fg); }
    `;
    shadow.appendChild(style);
  } catch {
    // Theming is a nicety; the tour still works with PiixPal's own card.
  }
}

export function OnboardingTour() {
  const userId = useSelector((state) => state.auth.user?.userId);
  const location = useLocation();
  const navigate = useNavigate();

  const scoutWrapRef = useRef(null);
  const activeRef = useRef(false);
  const startingRef = useRef(false);
  const autoStartedRef = useRef(false);
  const suppressPersistRef = useRef(false);
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  const startTourRef = useRef(() => {});

  const isHome = location.pathname === ROUTES.HOME;
  const completionKey = userId != null ? `${STORAGE_PREFIX}${userId}` : null;

  const getHost = useCallback(
    () => scoutWrapRef.current?.querySelector(SCOUT_SELECTOR) ?? null,
    []
  );

  const startTour = useCallback(async () => {
    if (startingRef.current || activeRef.current) return;
    startingRef.current = true;
    const runId = ++runIdRef.current;

    try {
      if (location.pathname !== ROUTES.HOME) {
        navigate(ROUTES.HOME);
      }

      // Wait for PiixPal to mount and for the stable anchors (composer and
      // search) to be in the DOM. If the user was on another page, this also
      // covers the navigation back to Home.
      const host = await waitFor(() => {
        if (!mountedRef.current || runIdRef.current !== runId) return null;
        const el = getHost();
        const hasAnchors =
          document.querySelector(COMPOSER_SELECTOR) &&
          document.querySelector(SEARCH_SELECTOR);
        return el?.ctl?.start && hasAnchors ? el : null;
      }, 8000);

      if (!host || !mountedRef.current || runIdRef.current !== runId) return;

      // The feed loads asynchronously. Give the first tweet a short window so
      // reply/retweet/quote can be part of the same tour; on an empty timeline
      // Scout simply skips those stops.
      await waitFor(() => document.querySelector(TWEET_SELECTOR), 3500);
      if (!mountedRef.current || runIdRef.current !== runId) return;

      host.ctl.start();
      activeRef.current = true;
      applyTourTheme();
    } finally {
      startingRef.current = false;
    }
  }, [getHost, location.pathname, navigate]);

  startTourRef.current = startTour;

  // Auto-start once per user, on Home. The short delay lets the feed paint.
  useEffect(() => {
    if (!userId || !isHome) return;
    if (autoStartedRef.current || activeRef.current) return;
    if (completionKey && readCompletion(completionKey)) return;

    const timer = window.setTimeout(() => {
      if (autoStartedRef.current || activeRef.current) return;
      autoStartedRef.current = true;
      startTourRef.current();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [userId, isHome, completionKey]);

  // PiixPal dispatches these on the host element; they bubble to window.
  useEffect(() => {
    const handleStep = () => {
      activeRef.current = true;
    };

    const handleEnd = () => {
      activeRef.current = false;
      if (suppressPersistRef.current) {
        suppressPersistRef.current = false;
        return;
      }
      if (completionKey) markCompleted(completionKey);
    };

    const handleManualStart = () => {
      if (activeRef.current || startingRef.current) return;
      startTourRef.current();
    };

    // Scout's own click handler would start a tour from whatever data-tour
    // stops happen to be on the current page. Capture the press first so the
    // mascot always starts the controlled Home tour.
    const handlePointerDown = (event) => {
      const actor = getHost()?.actor;
      if (!actor) return;
      const path = event.composedPath?.() ?? [];
      if (!path.includes(actor.node) && !path.includes(actor.cv)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (activeRef.current || startingRef.current) return;
      startTourRef.current();
    };

    window.addEventListener("piix:tour-step", handleStep);
    window.addEventListener("piix:tour-end", handleEnd);
    window.addEventListener("tweet-tour:start", handleManualStart);
    window.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.removeEventListener("piix:tour-step", handleStep);
      window.removeEventListener("piix:tour-end", handleEnd);
      window.removeEventListener("tweet-tour:start", handleManualStart);
      window.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [completionKey, getHost]);

  // Leaving Home invalidates the stops, so close the tour. This does not mark
  // it as seen: only finishing/skipping should suppress the first-run tour.
  useEffect(() => {
    if (!activeRef.current || isHome) return;
    suppressPersistRef.current = true;
    getHost()?.ctl?.end?.();
    activeRef.current = false;
  }, [isHome, getHost]);

  // Keep the card palette in sync when the app theme changes mid-tour.
  useEffect(() => {
    const syncTheme = () => {
      const uiHost = document.querySelector("[data-piixpal-ui]");
      if (!uiHost?.shadowRoot) return;
      uiHost.dataset.theme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
    };
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
    };
  }, []);

  return (
    <div
      ref={scoutWrapRef}
      className="pointer-events-none fixed bottom-4 right-40 z-40 h-16 w-16 max-sm:bottom-4 max-sm:right-36"
      aria-hidden="true"
    >
      <PiixPal pal="scout" />
    </div>
  );
}
