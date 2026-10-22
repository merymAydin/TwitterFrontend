import { cn } from "../../lib/utils";

export function Badge({ children, variant = "default", className }) {
  const variants = {
    default: "border border-border text-foreground-muted bg-surface",
    cobalt: "text-cobalt border border-cobalt",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[0.75rem] font-sans",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

