import api from "./axios";
import { ENDPOINTS } from "./endpoints";

/**
 * AI Service Layer
 *
 * Provides functions to interact with the Spring Boot backend's Gemini AI
 * endpoints. All requests use the existing Axios instance which automatically
 * attaches the JWT Bearer token from localStorage (see api/axios.js).
 *
 * NOTE: The audited backend contract specifies endpoint paths and that responses
 * are plain-text (not JSON). However, the exact request body formats for each
 * endpoint were NOT found in any audited document or existing source code within
 * this project. The request shapes below are reasonable assumptions based on
 * common REST patterns and endpoint semantics. They should be verified against
 * the actual backend contract before production use.
 */

export const aiService = {
  /**
   * Send a chat message to the AI assistant.
   *
   * POST /api/gemini/chat
   *
   * Verified backend contract (GeminiController.chat):
   *   public String chat(@RequestBody String message)
   * i.e. the endpoint expects a RAW plain-text body (not a JSON object) and
   * returns a plain-text String. There is no `tweetId` / context parameter.
   *
   * @param {Object} params
   * @param {string} params.message - The user's message text
   * @returns {Promise<string>} Plain-text response from the backend
   */
  chat: async ({ message } = {}) => {
    // Send the raw string with `text/plain` to match the `@RequestBody String`
    // parameter. `transformResponse` is left as a passthrough so Axios never
    // auto-parses the plain-text answer into an object (which is what produced
    // the "[object Object]" output previously).
    const response = await api.post(ENDPOINTS.AI.CHAT, String(message ?? ''), {
      headers: { 'Content-Type': 'text/plain' },
      responseType: 'text',
      transformResponse: [(data) => data],
    });

    const data = response.data;
    if (typeof data === 'string') return data;
    if (data == null) return '';

    // Unknown/unexpected shape — fail loudly instead of rendering "[object Object]".
    throw new Error('The assistant returned an unexpected response format.');
  },

  /**
   * Rewrite an existing tweet using AI.
   *
   * POST /api/gemini/rewrite/{tweetId}
   *
   * @param {string} tweetId - The ID of the tweet to rewrite
   * @param {Object} [options]
   * @param {string} [options.instructions] - Optional instructions for the rewrite
   * @returns {Promise<string>} Plain-text response with the rewritten tweet
   */
  rewriteTweet: async (tweetId, options = {}) => {
    const response = await api.post(ENDPOINTS.AI.REWRITE(tweetId), options);
    return response.data;
  },

  /**
   * Rewrite a draft tweet using AI.
   *
   * POST /api/gemini/rewriteDraft
   *
   * Verified backend contract (GeminiController.rewriteDraft):
   *   public String rewriteDraft(@RequestBody GeminiRewriteRequest request)
   * with `GeminiRewriteRequest(String content, String tone)` and a PLAIN-TEXT
   * string response.
   *
   * @param {Object} params
   * @param {string} params.content - The draft tweet content to rewrite
   * @param {string} [params.tone] - Tone passed to the model
   * @returns {Promise<string>} Plain-text response with the rewritten draft
   */
  rewriteDraft: async ({ content, tone = "clear and engaging" } = {}) => {
    // `responseType: 'text'` + passthrough keeps Axios from JSON-parsing the
    // plain-text reply (the same safeguard used by `chat`).
    const response = await api.post(
      ENDPOINTS.AI.REWRITE_DRAFT,
      { content, tone },
      {
        responseType: "text",
        transformResponse: [(data) => data],
      }
    );

    const data = response.data;
    if (typeof data === "string") return data;
    if (data == null) return "";

    // Unknown/unexpected shape — fail loudly instead of rendering "[object Object]".
    throw new Error("The assistant returned an unexpected response format.");
  },

  /**
   * Summarize a tweet using AI.
   *
   * POST /api/gemini/summarizeTweet
   *
   * @param {Object} params
   * @param {string} params.tweetId - The ID of the tweet to summarize
   * @param {string} [params.content] - The tweet content if ID is not available
   * @returns {Promise<string>} Plain-text summary of the tweet
   */
  summarizeTweet: async ({ tweetId, content }) => {
    const response = await api.post(ENDPOINTS.AI.SUMMARIZE, {
      tweetId,
      ...(content ? { content } : {}),
    });
    return response.data;
  },

  /**
   * Analyze a user's tweets using AI.
   *
   * POST /api/gemini/analyzeUserTweets
   *
   * @param {Object} params
   * @param {string} params.userId - The ID of the user whose tweets to analyze
   * @param {string} [params.username] - The username of the user (alternative to userId)
   * @returns {Promise<string>} Plain-text analysis of the user's tweets
   */
  analyzeUserTweets: async ({ userId, username }) => {
    const response = await api.post(ENDPOINTS.AI.ANALYZE_USER, {
      userId,
      ...(username ? { username } : {}),
    });
    return response.data;
  },
};

export default aiService;
