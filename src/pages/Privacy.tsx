import { Screen } from "@/components/layout/Screen";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Download, Trash2 } from "lucide-react";

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <Screen>
      <AppHeader
        title="Privacy"
        right={
          <Button variant="ghost" className="rounded-2xl" onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="text-sm font-semibold tracking-tight">Your data, your rules</div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This prototype stores notes locally in your browser. Cloud AI calls require an API key and are opt-in.
        </p>

        <div className="mt-5 grid gap-3">
          <Button variant="secondary" className="h-12 rounded-2xl justify-start gap-2">
            <Download className="h-4 w-4" />
            Export data
          </Button>
          <Button variant="destructive" className="h-12 rounded-2xl justify-start gap-2">
            <Trash2 className="h-4 w-4" />
            Delete all local data
          </Button>
        </div>

        <div className="mt-4 rounded-2xl bg-muted/50 p-4 text-xs text-muted-foreground">
          Privacy policy placeholder. Add your real policy before shipping.
        </div>
      </Card>
    </Screen>
  );
}
