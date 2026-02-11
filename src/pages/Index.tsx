import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAppState } from "@/state/AppStateProvider";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FeatureHero } from "@/components/visuals/FeatureHero";

const Index = () => {
  const navigate = useNavigate();
  const { preferences } = useAppState();

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-md px-4 pt-10 pb-24">
        <div className="text-xs font-semibold text-muted-foreground">
          {brand.packageName}
        </div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {brand.appName}
        </h1>

        <FeatureHero className="mt-6" />

        <Button
          className="mt-6 h-12 w-full rounded-2xl"
          onClick={() =>
            navigate(preferences.onboardingCompleted ? "/app/record" : "/onboarding")
          }
        >
          {preferences.onboardingCompleted ? "Open app" : "Get started"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          Placeholder branding — swap colors/strings in one place.
        </p>
      </div>
    </div>
  );
};

export default Index;