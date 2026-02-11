import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/state/AppStateProvider";

const perks = [
  "Unlimited transcription minutes",
  "Unlimited chat (global + per note)",
  "Unlimited AI Moment Cards (no watermark)",
  "Export PDF",
  "Advanced summaries",
] as const;

export default function PaywallPage() {
  const navigate = useNavigate();
  const { preferences, setPreferences } = useAppState();

  return (
    <Screen className="pt-8">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground">Upgrade</div>
        <Button variant="ghost" className="rounded-2xl" onClick={() => navigate(-1)}>
          Close
        </Button>
      </div>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Go Pro</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        You can preview results on Free. Pro removes limits and unlocks exports.
      </p>

      <Card className="mt-6 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          Pro includes
        </div>
        <div className="mt-4 space-y-2">
          {perks.map((p) => (
            <div key={p} className="flex items-start gap-2 text-sm">
              <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-primary">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span className="text-foreground/90">{p}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-muted/50 p-4 text-xs text-muted-foreground">
          Product IDs (placeholders): {brand.proProducts.monthlyId}, {brand.proProducts.yearlyId}
        </div>

        <div className="mt-5 grid gap-3">
          <Button
            className="h-12 rounded-2xl"
            onClick={() => {
              setPreferences({ ...preferences, proEnabled: true });
              navigate("/app/profile", { replace: true });
            }}
          >
            Enable Pro (prototype)
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-2xl"
            onClick={() => navigate("/app/record")}
          >
            Continue on Free
          </Button>
        </div>
      </Card>
    </Screen>
  );
}
