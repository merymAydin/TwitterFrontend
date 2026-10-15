export function PageHeader({ title, description }) {
  return (
    <div className="mb-8">
      <h1 className="text-display font-serif">{title}</h1>
      {description && <p className="mt-2 text-small text-foreground-muted">{description}</p>}
    </div>
  );
}
