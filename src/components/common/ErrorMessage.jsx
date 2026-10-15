export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 rounded-md border border-cobalt text-[0.875rem] bg-surface text-cobalt">
      {message}
    </div>
  );
}
