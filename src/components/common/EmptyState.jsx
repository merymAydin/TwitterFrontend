export function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-body text-foreground-muted">{title}</p>
      {description && <p className="mt-2 text-small text-foreground-muted">{description}</p>}
    </div>
  );
}

