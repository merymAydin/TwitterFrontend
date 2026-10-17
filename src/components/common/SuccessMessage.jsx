export function SuccessMessage({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 rounded-md border border-[#2d79f3] bg-[#f0f7ff] text-[#1d4ed8] text-[0.875rem]">
      {message}
    </div>
  );
}
