import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
