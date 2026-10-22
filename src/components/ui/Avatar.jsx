import { cn } from "../../lib/utils";
// Default profile picture shown whenever a user has no photo (or it fails to load).
import defaultAvatar from "../../assets/tw.avif";
import { useState } from "react";

const SIZE_CLASSES = {
  32: "h-8 w-8",
  40: "h-10 w-10",
  44: "h-11 w-11",
  48: "h-12 w-12",
  56: "h-14 w-14",
  64: "h-16 w-16",
  96: "h-24 w-24",
};

export function Avatar({ src, username, className, size = 48 }) {
  // Track which src failed instead of a boolean, so a new src (e.g. after the
  // user changes their photo) is retried automatically.
  const [failedSrc, setFailedSrc] = useState(null);
  const useFallback = !src || failedSrc === src;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-border",
        SIZE_CLASSES[size] ?? "h-10 w-10",
        className
      )}
      aria-label={username ? `Avatar for ${username}` : undefined}
    >
      {useFallback ? (
        <img src={defaultAvatar} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <img
          src={src}
          alt=""
          className="h-full w-full rounded-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      )}
    </div>
  );
}
