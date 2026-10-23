import { NavLink } from "react-router-dom";

export function AppLink({ to, children, className, activeClassName, active = true, end = true, ...props }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        // Colour is inherited (body/foreground) so per-link text-* classes such
        // as text-cobalt or text-[…] are not overridden by a base utility.
        const base = "transition-colors";
        const hover = "hover:bg-border hover:text-cobalt";
        const focus = "focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2";
        const isActiveState = active && isActive;
        const activeClasses = isActiveState ? `bg-cobalt/10 text-cobalt ${activeClassName || ""}` : "";
        return [base, hover, focus, activeClasses, className || ""].filter(Boolean).join(" ");
      }}
      {...props}
    >
      {children}
    </NavLink>
  );
}

