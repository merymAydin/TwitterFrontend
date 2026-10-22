import { BadgeCheck } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Blue check shown next to a verified user's name.
 *
 * IMPORTANT: verified status is never inferred on the client. The backend
 * derives `premium` from persisted Stripe subscription states (active,
 * trialing, past_due) and exposes it on UserResponse/PublicUserResponse. The
 * subscription status endpoint is still the source of truth for checkout.
 */
export function isUserVerified(user) {
  if (!user) return false;
  return Boolean(user.verified || user.isVerified || user.premium || user.isPremium);
}

export function VerifiedBadge({ size = 16, className, title = "Verified account" }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center text-cobalt", className)}
      role="img"
      aria-label={title}
      title={title}
    >
      <BadgeCheck size={size} strokeWidth={2} className="fill-cobalt/10" />
    </span>
  );
}

