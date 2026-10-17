export function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-prose-width w-full">
        {children}
      </div>
    </div>
  );
}
