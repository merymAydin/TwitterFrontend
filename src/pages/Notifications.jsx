import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";

export function Notifications() {
  return (
    <div>
      <PageHeader title="Notifications" description="Activity on your account" />
      <EmptyState title="No notifications" description="You're all caught up." />
    </div>
  );
}
