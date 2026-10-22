import { AppLink } from "../ui/Link";
import { ROUTES } from "../../router";
import { Search } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-background p-4">
      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-small focus:outline-none focus:ring-2 focus:ring-cobalt"
          />
        </div>
      </div>
    </header>
  );
}

