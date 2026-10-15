import { cn } from "../lib/utils";

export function Container({ children, className }) {
  return (
    <div className={cn("max-w-prose-width mx-auto", className)}>{children}</div>
  );
}
