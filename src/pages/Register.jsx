import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Input, Button, Divider, Link as AppLink } from "../components/ui";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { ROUTES } from "../router";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signUp, loading, error, clearAuthError } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    signUp({ name, email, password });
  };

  return (
    <div className="max-w-xs mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-display font-serif text-cobalt">t.</h1>
        <p className="mt-2 text-small text-foreground-muted">Create your account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorMessage message={error} />
        <Input id="name" label="Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input id="email" label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input id="password" label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <Divider />
      <p className="text-center text-small text-foreground-muted">
        Already have an account?{" "}
        <AppLink to={ROUTES.LOGIN} className="text-cobalt font-label">
          Sign in
        </AppLink>
      </p>
    </div>
  );
}
