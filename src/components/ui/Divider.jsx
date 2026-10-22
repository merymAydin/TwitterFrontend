export function Divider({ className }) {
  return (
    <div
      className="border-t border-border my-6"
      {...(className ? { className } : {})}
    />
  );
}

