// Minimal class-name combiner. Keeps Tailwind classes deterministic without
// introducing clsx/tailwind-merge as extra dependencies.
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Turns an Axios/Redux error into a readable string that surfaces the real HTTP
// status together with the backend's own error message. The backend responds
// with ErrorResponse = { status, message, timestamp }, but `error.response.data`
// can also be a plain string, so both shapes are handled. Falling back to the
// raw object would crash React (objects are not valid JSX children).
export function formatApiError(error, fallback = "Something went wrong") {
  if (typeof error === "string") return error;

  const status = error?.response?.status;
  const data = error?.response?.data;
  const backendMessage =
    (typeof data === "string" && data.trim()) ||
    (data && typeof data === "object" ? data.message || data.error : "");

  const message = backendMessage || error?.message || fallback;
  return status ? `HTTP ${status}: ${message}` : message;
}

// Decodes a JWT payload without verifying the signature (the server verifies it).
// Kept as a small display/debug helper; authorization decisions always rely on
// the backend, and the current user is loaded from GET /users/me.
export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
