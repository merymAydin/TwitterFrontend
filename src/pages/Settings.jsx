import { BadgeCheck, ChevronRight } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { AppLink } from "../components/ui/Link";
import { ROUTES } from "../router";

export function Settings() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader title="Settings" description="Account preferences" />

      <section>
        <h2 className="mb-3 text-base font-medium text-foreground">Account</h2>
        <AppLink
          to={ROUTES.VERIFIED}
          className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 transition-colors hover:border-cobalt"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt/10 text-cobalt">
            <BadgeCheck size={20} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-small font-medium text-foreground">Verified</span>
            <span className="block text-[0.8rem] text-foreground-muted">
              Subscribe to get the blue check next to your name
            </span>
          </span>
          <ChevronRight size={18} strokeWidth={1.8} className="shrink-0 text-foreground-muted" />
        </AppLink>
      </section>
    </div>
  );
}

