import { cn } from "../../lib/utils";

export function Button({ type = "button", variant = "primary", children, disabled, className, ...props }) {
  const base =
    "inline-flex items-center justify-center font-label text-foreground disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: `bg-cobalt text-white hover:bg-cobalt-hover`,
    secondary: `bg-surface border border-border hover:bg-cobalt hover:text-white`,
    ghost: `hover:bg-cobalt hover:text-white`,
    danger: `text-foreground hover:bg-surface`,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
