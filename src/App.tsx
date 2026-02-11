import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import AppLayout from "@/pages/AppLayout";
import RecordPage from "@/pages/Record";
import NotesPage from "@/pages/Notes";
import SearchPage from "@/pages/Search";
import ProfilePage from "@/pages/Profile";
import PaywallPage from "@/pages/Paywall";
import PrivacyPage from "@/pages/Privacy";
import NoteDetailPage from "@/pages/NoteDetail";
import ChatPage from "@/pages/Chat";
import { AppStateProvider, useAppState } from "@/state/AppStateProvider";
import { BackgroundJobsBootstrap } from "@/background/BackgroundJobsBootstrap";

const queryClient = new QueryClient();

function AppGate() {
  const { preferences } = useAppState();
  if (!preferences.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/app/record" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppStateProvider>
        <BackgroundJobsBootstrap />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/start" element={<AppGate />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="/app/record" replace />} />
              <Route path="record" element={<RecordPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="/note/:noteId" element={<NoteDetailPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/paywall" element={<PaywallPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppStateProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;