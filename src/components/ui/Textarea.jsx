import { cn } from "../../lib/utils";

export function Textarea({ id, label, placeholder, value, onChange, rows = 4, className, ...props }) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-label font-sans">
          {label}
        </label>
      )}
      <textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        className={cn(
          "flex w-full rounded-md border border-border bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-cobalt resize-none",
          className
        )}
        {...props}
      />
    </div>
  );
}

