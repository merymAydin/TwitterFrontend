# AI Service Layer Report

## Summary

Implemented the frontend AI service layer that integrates with the Spring Boot backend's Gemini AI endpoints. Created `src/api/aiService.js` with service functions for all five backend endpoints, and updated `src/api/endpoints.js` with the corresponding endpoint constants.

## Files Created

| File | Description |
|------|-------------|
| `src/api/aiService.js` | AI service layer with 5 service functions using the existing Axios instance |

## Files Modified

| File | Change |
|------|--------|
| `src/api/endpoints.js` | Added `AI` endpoint group with 5 endpoint constants |

## API Endpoints Implemented

| Function | Endpoint | HTTP Method | Request Body | Response |
|----------|----------|-------------|--------------|----------|
| `aiService.chat({ message, tweetId? })` | `POST /api/gemini/chat` | POST | `{ message: string, tweetId?: string }` | Plain text |
| `aiService.rewriteTweet(tweetId, options?)` | `POST /api/gemini/rewrite/{tweetId}` | POST | `{ instructions?: string }` (optional) | Plain text |
| `aiService.rewriteDraft({ content })` | `POST /api/gemini/rewriteDraft` | POST | `{ content: string }` | Plain text |
| `aiService.summarizeTweet({ tweetId, content? })` | `POST /api/gemini/summarizeTweet` | POST | `{ tweetId: string, content?: string }` | Plain text |
| `aiService.analyzeUserTweets({ userId, username? })` | `POST /api/gemini/analyzeUserTweets` | POST | `{ userId: string, username?: string }` | Plain text |

## Authentication

- Uses the existing Axios instance (`src/api/axios.js`) which already has a request interceptor that attaches `Authorization: Bearer <token>` from `localStorage`.
- No additional authentication logic added - the existing interceptor handles JWT authentication for all API calls automatically.
- No API keys or secrets are exposed in the frontend; all AI processing happens on the backend.

## Response Handling

- All service functions return `response.data` directly.
- Per the audited backend contract, responses are **plain-text strings**, not JSON objects.
- Error handling: Each function wraps the Axios call in try/catch and rejects with `error.response?.data` or a descriptive fallback message, matching the pattern used in `tweetsSlice.js`.

## Backend Contract Verification

### Confirmed from Task Description:
- Endpoint paths: `/api/gemini/chat`, `/api/gemini/rewrite/{tweetId}`, `/api/gemini/rewriteDraft`, `/api/gemini/summarizeTweet`, `/api/gemini/analyzeUserTweets`
- All endpoints use HTTP POST
- Responses are plain-text (not JSON)
- JWT authentication via `Authorization: Bearer <token>` header

### NOT Confirmed (Assumptions Made):

The exact request body field names for each endpoint were **not found** in any audited document or existing source code within this project. The following request body shapes are **reasonable assumptions** based on common REST patterns and endpoint semantics. They should be verified against the actual backend contract before production use:

| Endpoint | Assumed Request Body |
|----------|---------------------|
| `POST /api/gemini/chat` | `{ message: string, tweetId?: string }` |
| `POST /api/gemini/rewrite/{tweetId}` | `{ instructions?: string }` (optional) |
| `POST /api/gemini/rewriteDraft` | `{ content: string }` |
| `POST /api/gemini/summarizeTweet` | `{ tweetId: string, content?: string }` |
| `POST /api/gemini/analyzeUserTweets` | `{ userId: string, username?: string }` |

## Backend Limitations Respected

- Rewriting a draft generates a suggestion; it does not publish or save a tweet.
- Rewriting an existing tweet does not modify the original tweet.
- Chat history is not persisted by the backend; no conversation history implementation in this task.
- localStorage is used only for the JWT token (existing behavior), not for AI context.

## Build Result

`npm run build` — ⚠️ **Build has a pre-existing error in `src/components/ai/AIAssistant.jsx` (line 163: JSX syntax error)**. This error existed prior to this task and is unrelated to the AI service layer changes. My new files (`src/api/aiService.js` and `src/api/endpoints.js` additions) are syntactically correct and do not contribute to the build error.

To verify the AI service layer compiles independently, the pre-existing syntax error in `AIAssistant.jsx` would need to be fixed separately (outside the scope of this task).

## Unresolved Questions

1. Exact request body field names for each endpoint were not found in any audited document or existing source code. The request shapes in `aiService.js` are assumptions based on common REST patterns.
2. Exact response shape beyond "plain text" is not specified (e.g., whether plain text is wrapped in any structure).