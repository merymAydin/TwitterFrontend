import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";

export function Explore() {
  return (
    <div>
      <PageHeader title="Explore" description="What's happening" />
      <EmptyState title="Explore" description="Discover new content." />
    </div>
  );
}
