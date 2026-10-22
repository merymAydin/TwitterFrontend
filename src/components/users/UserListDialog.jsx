import { useEffect } from "react";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { AppLink } from "../ui/Link";
import { Avatar } from "../ui/Avatar";
import { FollowButton } from "./FollowButton";
import { VerifiedBadge, isUserVerified } from "./VerifiedBadge";
import { ROUTES } from "../../router";

/**
 * Dialog listing the followers / following of a user.
 *
 * The list is a set of user ids derived from GET /followers; each id is
 * resolved to a name and avatar through the users map (GET /users).
 */
export function UserListDialog({ title, userIds = [], onClose }) {
  const usersById = useSelector((state) => state.users.byId);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-medium text-foreground">{title}</h2>
            <span className="text-small text-foreground-muted">{userIds.length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-black/5 hover:text-foreground"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {userIds.length === 0 ? (
          <p className="px-5 py-12 text-center text-small text-foreground-muted">
            {title === "Followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-y-auto" role="list">
            {userIds.map((id) => {
              const user = usersById[id];
              const name = user?.username ?? `User ${id}`;
              return (
                <li key={id} className="flex items-center gap-3 px-5 py-3">
                  <AppLink
                    to={ROUTES.PROFILE(id)}
                    onClick={onClose}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Avatar src={user?.photo} username={name} size={44} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1">
                        <span className="truncate text-small font-medium text-foreground">
                          {name}
                        </span>
                        {isUserVerified(user) && <VerifiedBadge size={14} />}
                      </span>
                      <span className="block truncate text-[0.8rem] text-foreground-muted">
                        @{user?.username ?? id}
                      </span>
                    </span>
                  </AppLink>
                  <FollowButton userId={id} size="sm" className="shrink-0" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

