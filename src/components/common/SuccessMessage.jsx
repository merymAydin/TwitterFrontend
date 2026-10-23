export function SuccessMessage({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 rounded-md border border-cobalt/40 bg-cobalt/10 text-cobalt text-[0.875rem]">
      {message}
    </div>
  );
}

