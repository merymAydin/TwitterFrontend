import { cn } from "../../lib/utils";
import defaultAvatar from "../../assets/avatar-default.svg";
import { useState } from "react";

export function Avatar({ src, username, className, size = 48 }) {
  const [hasError, setHasError] = useState(false);

  const handleError = () => setHasError(true);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-border",
        size === 44 ? "h-11 w-11" : size === 48 ? "h-12 w-12" : "h-10 w-10",
        className
      )}
      aria-label={username ? `Avatar for ${username}` : undefined}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt=""
          className="rounded-full w-full h-full object-cover"
          onError={handleError}
        />
      ) : (
        <img src={defaultAvatar} alt="" className="rounded-full w-full h-full object-cover" />
      )}
    </div>
  );
}
