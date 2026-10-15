import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";

export function Settings() {
  return (
    <div>
      <PageHeader title="Settings" description="Account preferences" />
      <EmptyState title="Settings" description="Configure your account." />
    </div>
  );
}
