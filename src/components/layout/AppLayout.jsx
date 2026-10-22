import { AIProvider } from "../../context/AIContext";
import { AIAssistant } from "../../components/ai/AIAssistant";
import { OnboardingTour } from "../onboarding/OnboardingTour";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }) {
  return (
    <AIProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background px-32 pt-6 max-sm:px-4">
            {children}
          </main>
        </div>
        <AIAssistant />
        <OnboardingTour />
      </div>
    </AIProvider>
  );
}

