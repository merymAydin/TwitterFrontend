import { useDispatch, useSelector } from "react-redux";
import { AppLink } from "../ui/Link";
import { ROUTES } from "../../router";
import { logout } from "../../store/slices/authSlice";
import { useTheme } from "../../context/ThemeContext";
import { Home, Bell, Compass, Settings, LogOut, Bookmark, User, Moon, Sun, HelpCircle } from "lucide-react";

export function Sidebar() {
  const dispatch = useDispatch();
  const currentUserId = useSelector((state) => state.auth.user?.userId);
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: ROUTES.HOME, label: "Home", icon: Home },
    { path: ROUTES.EXPLORE, label: "Explore", icon: Compass },
    { path: ROUTES.BOOKMARKS, label: "Bookmarks", icon: Bookmark },
    { path: ROUTES.NOTIFICATIONS, label: "Notifications", icon: Bell },
    // Own profile — links to the signed-in user's id (resolved from GET
    // /users/me). Rendered once that id is known.
    currentUserId != null && {
      path: ROUTES.PROFILE(currentUserId),
      label: "Profile",
      icon: User,
    },
    { path: ROUTES.SETTINGS, label: "Settings", icon: Settings },
  ].filter(Boolean);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleTour = () => {
    window.dispatchEvent(new CustomEvent("tweet-tour:start"));
  };

  return (
    <aside className="flex-shrink-0 w-[280px] border-r border-border bg-surface p-4 max-sm:w-[72px] max-sm:p-2">
      <div className="mb-8 max-sm:mb-4">
        <AppLink
          to={ROUTES.HOME}
          className="flex items-center gap-2 font-serif text-[2.75rem] font-medium text-cobalt max-sm:justify-center max-sm:text-[1.75rem]"
          active={false}
        >
          t.
        </AppLink>
      </div>
      <nav className="flex flex-col gap-2 max-sm:gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <AppLink
              key={item.label}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground font-sans text-base min-h-[48px] max-sm:justify-center max-sm:px-0"
            >
              <Icon size={24} strokeWidth={2} className="shrink-0" />
              <span className="text-base max-sm:hidden">{item.label}</span>
            </AppLink>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2 pt-4 border-t border-border">
        <button
          onClick={handleTour}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground font-sans text-base hover:bg-border transition-colors max-sm:justify-center max-sm:px-0 min-h-[48px] w-full"
          aria-label="Take the guided tour"
          title="Take a tour"
        >
          <HelpCircle size={24} strokeWidth={2} className="shrink-0" />
          <span className="max-sm:hidden">Take a tour</span>
        </button>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground font-sans text-base hover:bg-border transition-colors max-sm:justify-center max-sm:px-0 min-h-[48px] w-full"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun size={24} strokeWidth={2} className="shrink-0" />
          ) : (
            <Moon size={24} strokeWidth={2} className="shrink-0" />
          )}
          <span className="max-sm:hidden">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground font-sans text-base hover:bg-border transition-colors max-sm:justify-center max-sm:px-0 min-h-[48px] w-full"
        >
          <LogOut size={24} strokeWidth={2} className="shrink-0" />
          <span className="max-sm:hidden">Log out</span>
        </button>
      </div>
    </aside>
  );
}

