import { cn } from "../../lib/utils";

export function Avatar({ src, username, className, size = 32 }) {
  const sizeClass = size === 24 ? "h-6 w-6" : size === 40 ? "h-10 w-10" : "h-8 w-8";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-border text-foreground-muted font-sans text-small",
        sizeClass,
        className
      )}
      aria-label={username ? `Avatar for ${username}` : undefined}
    >
      {src ? <img src={src} alt="" className="rounded-full" /> : username.charAt(0).toUpperCase()}
    </div>
  );
}
