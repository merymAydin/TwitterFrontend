import { useParams } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { Avatar } from "../components/ui/Avatar";

export function Profile() {
  const { username } = useParams();

  return (
    <div>
      <PageHeader title="Profile" description={`@${username}`} />
      <div className="flex items-center gap-4">
        <Avatar username={username} />
        <div>
          <h2 className="text-heading font-serif">{username}</h2>
          <p className="text-small text-foreground-muted">@{username}</p>
        </div>
      </div>
      <EmptyState title="No posts" description={`Posts by @${username} will appear here.`} />
    </div>
  );
}
