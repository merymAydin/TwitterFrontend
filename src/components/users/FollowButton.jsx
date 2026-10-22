import { useState } from "react";
import { useSelector } from "react-redux";
import { useFollow } from "../../hooks/useFollow";
import { cn } from "../../lib/utils";

/**
 * Follow / Unfollow button.
 *
 * Renders nothing for your own profile (the profile header shows "Edit profile"
 * instead). The relationship itself always comes from GET /followers, so the
 * label also survives a page reload.
 */
export function FollowButton({ userId, className, size = "md" }) {
  const currentUserId = useSelector((state) => state.auth.user?.userId);
  const { isFollowing, isPending, toggleFollow } = useFollow();
  const [actionError, setActionError] = useState(null);

  const targetId = Number(userId);
  const isSelf = currentUserId != null && Number(currentUserId) === targetId;
  if (userId == null || isSelf) return null;

  const following = isFollowing(targetId);
  const pending = isPending(targetId);

  const label = pending
    ? following
      ? "Following…"
      : "Unfollowing…"
    : following
      ? "Unfollow"
      : "Follow";

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActionError(null);
    try {
      await toggleFollow(targetId).unwrap();
    } catch (err) {
      setActionError(
        typeof err === "string" ? err : err?.message || "Could not update the follow state."
      );
    }
  };

  const sizing = size === "sm" ? "px-3.5 py-1 text-[0.8rem]" : "px-5 py-1.5 text-sm";

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={following}
        className={cn(
          "shrink-0 rounded-full border font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
          sizing,
          following
            ? "border-border bg-white text-foreground hover:border-[#DC2626] hover:text-[#DC2626]"
            : "border-cobalt bg-cobalt text-white hover:border-cobalt-hover hover:bg-cobalt-hover"
        )}
      >
        {label}
      </button>
      {actionError && (
        <p role="alert" className="max-w-[16rem] text-right text-[0.75rem] text-[#DC2626]">
          {actionError}
        </p>
      )}
    </div>
  );
}

