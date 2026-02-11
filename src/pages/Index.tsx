import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { useAppState } from "@/state/AppStateProvider";
import { ArrowRight, Mic, NotebookText, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const { preferences } = useAppState();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-4 pt-10 pb-24">
        <div className="text-xs font-semibold text-muted-foreground">{brand.packageName}</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{brand.appName}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          An AI voice notes recorder that transcribes, summarizes, organizes — and lets you chat/search across your notes.
        </p>

        <Card className="mt-6 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-muted/60 px-3 py-3 text-xs">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <Mic className="h-4 w-4 text-primary" />
                Record
              </div>
              <div className="text-muted-foreground">Fast capture</div>
            </div>
            <div className="rounded-2xl bg-muted/60 px-3 py-3 text-xs">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <NotebookText className="h-4 w-4 text-primary" />
                Notes
              </div>
              <div className="text-muted-foreground">Auto organize</div>
            </div>
            <div className="rounded-2xl bg-muted/60 px-3 py-3 text-xs">
              <div className="mb-1 flex items-center gap-2 font-semibold">
                <Search className="h-4 w-4 text-primary" />
                Search
              </div>
              <div className="text-muted-foreground">Semantic</div>
            </div>
          </div>

          <Button
            className="mt-5 h-12 w-full rounded-2xl"
            onClick={() => navigate(preferences.onboardingCompleted ? "/app/record" : "/onboarding")}
          >
            {preferences.onboardingCompleted ? "Open app" : "Get started"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Placeholder branding. Colors + strings are centralized.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Index;