import { cn } from "../../lib/utils";

export function Input({ id, label, type = "text", placeholder, value, onChange, required, className, ...props }) {
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-label font-sans">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={cn(
          "flex w-full rounded-md border border-border bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-cobalt",
          className
        )}
        {...props}
      />
    </div>
  );
}

