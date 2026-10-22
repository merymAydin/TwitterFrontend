import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Skeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { AppLink } from "../components/ui/Link";
import { ROUTES } from "../router";
import { fetchNotifications, markNotificationRead } from "../store/slices/notificationsSlice";
import { cn } from "../lib/utils";

function getNotificationText(notification) {
  const type = notification.type ?? notification.notificationType ?? "";
  const username = notification.actorUsername ?? notification.username ?? notification.actor?.username;
  switch (type.toUpperCase()) {
    case "MENTION":
      return `${username ?? "Someone"} mentioned you in a tweet`;
    case "LIKE":
      return `${username ?? "Someone"} liked your tweet`;
    case "RETWEET":
      return `${username ?? "Someone"} retweeted your tweet`;
    case "FOLLOW":
      return `${username ?? "Someone"} followed you`;
    case "REPLY":
      return `${username ?? "Someone"} replied to your tweet`;
    default:
      return notification.message ?? notification.content ?? "New notification";
  }
}

function getNotificationLink(notification) {
  const tweetId = notification.tweetId ?? notification.tweet?.id;
  if (tweetId) return ROUTES.TWEET_DETAIL(tweetId);
  const userId = notification.actorId ?? notification.userId ?? notification.actor?.userId;
  if (userId) return ROUTES.PROFILE(userId);
  return null;
}

export function Notifications() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.notifications);
  const usersByIdMap = useSelector((state) => state.users.byId);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleMarkRead = (id) => {
    dispatch(markNotificationRead(id));
  };

  if (loading && items.length === 0) {
    return (
      <div>
        <PageHeader title="Notifications" description="Activity on your account" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div>
        <PageHeader title="Notifications" description="Activity on your account" />
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <PageHeader title="Notifications" description="Activity on your account" />
        <EmptyState title="No notifications" description="You're all caught up." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notifications" description="Activity on your account" />
      <ul className="space-y-2" role="list">
        {items.map((notification) => {
          const id = notification.id ?? notification.notificationId;
          const isRead = notification.read ?? notification.isRead ?? false;
          const actorId = notification.actorId ?? notification.userId ?? notification.actor?.userId;
          const actor = actorId != null ? usersByIdMap[actorId] : null;
          const actorName = actor?.username ?? notification.actorUsername ?? "Someone";
          const link = getNotificationLink(notification);

          return (
            <li key={id}>
              {link ? (
                <AppLink
                  to={link}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-surface",
                    !isRead && "bg-cobalt/5"
                  )}
                  onClick={() => handleMarkRead(id)}
                >
                  <Avatar src={actor?.photo} username={actorName} size={40} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-small text-foreground">{getNotificationText(notification)}</p>
                    {notification.createdAt && (
                      <time className="text-[0.75rem] text-foreground-muted">
                        {new Date(notification.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    )}
                  </div>
                  {!isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cobalt" />}
                </AppLink>
              ) : (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-3",
                    !isRead && "bg-cobalt/5"
                  )}
                >
                  <Avatar src={actor?.photo} username={actorName} size={40} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-small text-foreground">{getNotificationText(notification)}</p>
                  </div>
                  {!isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cobalt" />}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
