export function Skeleton({ className }) {
  return (
    <div
      className="animate-pulse rounded-sm bg-surface"
      {...(className ? { className } : {})}
    />
  );
}

