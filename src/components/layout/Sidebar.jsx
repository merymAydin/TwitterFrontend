import { useDispatch } from "react-redux";
import { AppLink } from "../ui/Link";
import { ROUTES } from "../../router";
import { logout } from "../../store/slices/authSlice";
import { Home, Bell, Compass, Settings, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { path: ROUTES.HOME, label: "Home", icon: Home },
  { path: ROUTES.EXPLORE, label: "Explore", icon: Compass },
  { path: ROUTES.NOTIFICATIONS, label: "Notifications", icon: Bell },
  { path: ROUTES.SETTINGS, label: "Settings", icon: Settings },
];

export function Sidebar() {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <aside className="flex-shrink-0 w-[280px] border-r border-border bg-surface p-4">
      <div className="mb-6">
        <AppLink
          to={ROUTES.HOME}
          className="flex items-center gap-2 text-cobalt font-serif text-[2.5rem] font-medium"
        >
          t.
        </AppLink>
      </div>
      <nav className="flex flex-col gap-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <AppLink
              key={item.label}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground font-sans text-base hover:bg-border hover:text-cobalt transition-colors"
              activeClassName="bg-cobalt text-white"
            >
              <Icon size={24} strokeWidth={1.5} />
              <span className="text-base">{item.label}</span>
            </AppLink>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-foreground hover:bg-border transition-colors"
        >
          <LogOut size={24} strokeWidth={1.5} />
          <span className="text-small font-sans">Log out</span>
        </button>
      </div>
    </aside>
  );
}
