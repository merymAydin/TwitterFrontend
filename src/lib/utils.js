// Minimal class-name combiner. Keeps Tailwind classes deterministic without
// introducing clsx/tailwind-merge as extra dependencies.
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
