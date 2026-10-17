export function PageHeader({ title, description }) {
  return (
    <div className="mb-12">
      <h1 className="text-display font-serif pb-3">{title}</h1>
      {description && <p className="mt-2 text-small text-foreground-muted">{description}</p>}
    </div>
  );
}
