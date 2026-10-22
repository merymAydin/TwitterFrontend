// Renders an error as text. Accepts a string, but also flattens the backend's
// ErrorResponse object ({ status, message, timestamp }) so a raw payload can
// never be rendered as a React child (React error #31).
function toText(message) {
  if (message == null || message === false) return null;
  if (typeof message === "string") return message.trim() || null;
  if (typeof message === "number") return String(message);
  if (Array.isArray(message)) {
    const parts = message.map(toText).filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }
  if (typeof message === "object") {
    return toText(message.message) || toText(message.error) || null;
  }
  return null;
}

export function ErrorMessage({ message }) {
  const text = toText(message);
  if (!text) return null;
  return (
    <div className="mb-4 p-3 rounded-md border border-cobalt text-[0.875rem] bg-surface text-cobalt">
      {text}
    </div>
  );
}
