import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { brand } from "@/config/brand";
import { useAppState } from "@/state/AppStateProvider";
import { aiKeys } from "@/services/ai/AiService";
import { listTranscriptionProviders } from "@/services/transcription/providerRegistry";
import { EntitlementsService } from "@/services/entitlements/EntitlementsService";
import { CreditCard, KeyRound, Shield, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export default function ProfilePage() {
  const { preferences, setPreferences } = useAppState();
  const navigate = useNavigate();

  const providers = useMemo(() => listTranscriptionProviders(), []);
  const [openAiKey, setOpenAiKey] = useState(() => aiKeys.getOpenAiKey() ?? "");

  const entitlementsQuery = useQuery({
    queryKey: ["entitlements"],
    queryFn: () => EntitlementsService.ensureFresh(),
    refetchInterval: 2500,
  });

  const minutesUsed = entitlementsQuery.data?.minutesUsedThisMonth ?? 0;
  const cardsUsed = entitlementsQuery.data?.momentCardsUsedThisMonth ?? 0;

  return (
    <Screen>
      <AppHeader title="Profile" />

      <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold tracking-tight">Usage</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Minutes used this month • {minutesUsed} / {brand.limits.freeMinutesPerMonth}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Moment Cards • {cardsUsed} / {brand.limits.freeMomentCardsPerMonth}
            </div>
          </div>
          <div className="rounded-2xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            {preferences.proEnabled ? "PRO" : "FREE"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            className="h-12 rounded-2xl justify-start gap-2"
            onClick={() => navigate("/paywall")}
          >
            <CreditCard className="h-4 w-4" />
            Upgrade
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-2xl justify-start gap-2"
            onClick={() => navigate("/privacy")}
          >
            <Shield className="h-4 w-4" />
            Privacy
          </Button>
        </div>

        <div className="mt-4 rounded-2xl bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">AI training opt-out</div>
              <div className="text-xs text-muted-foreground">
                Stored locally. Included in AI request metadata when supported.
              </div>
            </div>
            <Switch
              checked={preferences.aiTrainingOptOut}
              onCheckedChange={(v) => setPreferences({ ...preferences, aiTrainingOptOut: v })}
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Pro (web prototype toggle)</div>
              <div className="text-xs text-muted-foreground">
                Simulates entitlements for limits + watermark.
              </div>
            </div>
            <Switch
              checked={preferences.proEnabled}
              onCheckedChange={(v) => setPreferences({ ...preferences, proEnabled: v })}
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Transcription provider</div>
              <div className="text-xs text-muted-foreground">
                Swappable provider interface — UI stays unchanged.
              </div>
            </div>
            <div className="w-[200px]">
              <Select
                value={preferences.transcriptionProvider}
                onValueChange={(v) =>
                  setPreferences({
                    ...preferences,
                    transcriptionProvider: v as "openai_whisper" | "web_speech",
                  })
                }
              >
                <SelectTrigger className="h-10 rounded-2xl">
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.displayName} • {p.qualityLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-muted/50 px-4 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" />
            OpenAI API key
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Stored locally (never hardcoded).</Label>
            <Input
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
              placeholder="sk-…"
              className="h-11 rounded-2xl"
            />
            <div className="flex gap-2">
              <Button
                className="h-11 rounded-2xl"
                onClick={() => {
                  aiKeys.setOpenAiKey(openAiKey.trim());
                  entitlementsQuery.refetch();
                }}
              >
                Save key
              </Button>
              <Button
                variant="secondary"
                className="h-11 rounded-2xl"
                onClick={() => {
                  aiKeys.clearOpenAiKey();
                  setOpenAiKey("");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          {brand.appName} is a placeholder brand — swap colors/strings in one place.
        </div>
      </Card>
    </Screen>
  );
}