
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { SuccessMessage } from "../components/common/SuccessMessage";
import { AppLink as Link } from "../components/ui/Link";
import { ROUTES } from "../router";
import { useSearchParams } from "react-router-dom";

export function Login() {
  const [searchParams] = useSearchParams();
  const showRegistrationSuccess = searchParams.get("success") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const { signIn, loading, error } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    signIn({ email, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[450px] flex-col gap-[14px] rounded-[20px] border border-border bg-surface-elevated p-[30px] font-sans"
      >
        {/* Logo */}
        <div className="mb-3 text-center">
          <h1 className="font-serif text-[36px] font-bold leading-tight text-[#2d5bea]">
            t.
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Sign in to your account
          </p>
        </div>

        {showRegistrationSuccess && (
          <SuccessMessage message="Account created successfully. Please sign in." />
        )}
        <ErrorMessage message={error} />

        {/* Email */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-foreground"
          >
            Email
          </label>

          <div className="flex h-[50px] w-full items-center gap-[10px] rounded-[10px] border-[1.5px] border-border bg-surface-elevated px-[10px] transition focus-within:border-[#2d79f3]">
            <Mail
              size={20}
              strokeWidth={1.8}
              className="h-5 w-5 shrink-0 text-foreground-muted"
            />

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-foreground-muted focus:ring-0"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-foreground"
          >
            Password
          </label>

          <div className="flex h-[50px] w-full items-center gap-[10px] rounded-[10px] border-[1.5px] border-border bg-surface-elevated px-[10px] transition focus-within:border-[#2d79f3]">
            <Lock
              size={20}
              strokeWidth={1.8}
              className="h-5 w-5 shrink-0 text-foreground-muted"
            />

            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-foreground-muted focus:ring-0"
            />
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <label className="flex cursor-pointer items-center gap-2 text-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-[15px] w-[15px] cursor-pointer accent-[#2d79f3]"
            />
            Remember me
          </label>

          <span className="text-[#2d79f3]">
            Forgot password?
          </span>
        </div>


        <button
  type="submit"
  disabled={loading}
  className="mt-1 flex h-[50px] w-full items-center justify-center rounded-[10px] border-0 bg-foreground px-4 text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
>
  {loading ? "Signing in..." : "Sign In"}
</button>

         
        <p className="my-1 text-center text-sm text-foreground-muted">
          Don't have an account?{" "}
          <Link
            to={ROUTES.REGISTER}
            className="font-medium text-[#2d79f3]"
          >
            Sign Up
          </Link>
        </p>

        {/* Divider */}
        <div className="my-1 flex items-center gap-3 text-center text-sm text-foreground-muted">
          <span className="h-px flex-1 bg-border" />
          Or With
          <span className="h-px flex-1 bg-border" />
        </div>

         
        <div className="flex gap-[10px]">
          <button
            type="button"
            className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-surface-elevated text-sm font-medium text-foreground transition hover:border-[#2d79f3] cursor-pointer"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
              <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z" />
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44z" />
              <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.2H5.8a20 20 0 0 0 0 17.8z" />
              <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4z" />
            </svg>
            Google
          </button>

          <button
            type="button"
            className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-surface-elevated text-sm font-medium text-foreground transition hover:border-[#2d79f3] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
              <path
                fill="currentColor"
                d="M16.4 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 7 1.1 9.3.7 1.1 1.5 2.3 2.6 2.2 1-.1 1.4-.7 2.7-.7s1.7.7 2.8.7c1.2 0 1.9-1.1 2.6-2.2.8-1.2 1.1-2.4 1.1-2.4s-2.1-.8-2.1-4.2zM14.2 6.5c.6-.8 1-1.9.9-3-1 .1-2.2.7-2.9 1.5-.6.7-1.1 1.8-1 2.9 1.1.1 2.3-.6 3-1.4z"
              />
            </svg>
            Apple
          </button>
        </div>
      </form>
    </div>
  );
}

