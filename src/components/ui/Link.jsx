import { NavLink } from "react-router-dom";

export function AppLink({ to, children, className, activeClassName, ...props }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => {
        const base = "text-foreground hover:text-cobalt transition-colors";
        const active = isActive ? `text-cobalt ${activeClassName || ""}` : "";
        return [base, active, className || ""].filter(Boolean).join(" ");
      }}
      {...props}
    >
      {children}
    </NavLink>
  );
}
