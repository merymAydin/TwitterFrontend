# Feed UI Redesign Report

## Overview

Redesigned the tweet display into a reusable `Tweet` component used by both `Feed` (Home timeline) and `TweetDetail` (individual tweet view). The design follows the established minimalist editorial direction: warm off-white background, near-black typography, cobalt accent, subtle hairline borders, minimal border radius, no shadows, no gradients.

## Files Changed

| File | Change |
|------|--------|
| `src/components/tweets/Tweet.jsx` | **New** — reusable tweet component with avatar, username, @handle, timestamp, content, and action row |
| `src/components/tweets/Feed.jsx` | Updated to import and render `<Tweet>` instead of `<TweetCard>` |
| `src/pages/TweetDetail.jsx` | Updated to import and render `<Tweet>` for the current tweet |
| `src/components/tweets/index.js` | Added `Feed` export; kept `Tweet` and `TweetCard` exports |
| `src/components/tweets/TweetCard.jsx` | Unchanged (kept for backward compatibility) |

## Component Architecture

```
components/tweets/
├── index.js          → exports: Tweet, TweetCard, Feed
├── Tweet.jsx         → reusable single-tweet component (NEW)
├── TweetCard.jsx     → original component (kept for backward compatibility)
└── Feed.jsx          → uses <Tweet> for each item in the list
```

```
pages/
├── Home.jsx          → renders <Feed />
└── TweetDetail.jsx   → renders <Tweet tweet={currentTweet} />
```

## Tweet Component Structure

Each tweet renders:

1. **Avatar** — 40px circular, clickable if user ID is available (falls back to letter avatar)
2. **Header row** — display name (serif), @username (muted), timestamp (muted, far right)
3. **Content** — body text (serif, readable line height)
4. **Action row** — Reply, Retweet, Like (with count), Bookmark, Share — all visually styled as minimal text+icon buttons with hover states
5. **Metadata** — tweet ID (from `statistics.tweetId`) shown on far right for debugging

## Design System Compliance

| Element | Value |
|---------|-------|
| Background | `#FAF9F6` (warm off-white) via `bg-background` |
| Text | `#1A1A1A` (near-black) via `text-foreground` |
| Muted text | `#57534E` via `text-foreground-muted` |
| Accent | `#1D4ED8` (cobalt) on hover states |
| Borders | `1px #E7E5E4` hairline via `border-border` |
| Border radius | 4px–6px via `rounded-md` |
| Shadows | None |
| Gradients | None |
| Font | Serif for display/headings, sans for body |

## Backend Contract Compliance

### What the contract supports:
- `GET /feed` — returns tweet list (used by Feed)
- `GET /tweet/{id}` — returns single tweet (used by TweetDetail)
- `statistics.tweetId` — tweet ID location
- `statistics.likes` — like count (displayed)
- `GET /users/{id}` — user profile endpoint (exists)

### What the contract does NOT support (and was NOT faked):

| Missing | Impact |
|---------|--------|
| `userId` in `TweetResponse` | **Cannot link avatar/username to `GET /users/{id}`** — profile navigation via ID is not possible |
| `GET /users/me` | Documented limitation; cannot resolve current user |
| `retweetCount`, `bookmarkCount`, `viewCount` in response | Not displayed (only `statistics.likes` is shown) |
| Comment count per tweet | No `GET /comments?tweetId=` endpoint exists |
| `author.id` / `user.id` flat field | Defensive code checks for it, but contract doesn't guarantee it |

### Profile Navigation Status

Avatar and username are wrapped in `<AppLink to={ROUTES.PROFILE(id)}}>` **only when** `authorInfo.id` is available. Since `TweetResponse` does not expose a user ID in the audited contract, profile links are conditionally rendered — they appear only if the backend happens to include `author.id` or `user.id` in the response. Otherwise, the name and @handle render as plain text without links.

This is reported as a backend limitation, not worked around by inventing IDs or guessing username-to-ID mappings.

## What Was NOT Done

- No like/retweet/bookmark click handlers (endpoints exist but feature implementation is out of scope for this UI redesign)
- No comment/reply display (no backend endpoint to fetch comments for a tweet)
- No optimistic updates
- No invented API endpoints
- No changes to authentication, Redux store, or Axios configuration

## Build Result

`npm run build` — ✅ Successful (2029 modules, no errors)