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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { brand } from "@/config/brand";
import { useAppState } from "@/state/AppStateProvider";
import { listTranscriptionProviders } from "@/services/transcription/providerRegistry";
import { EntitlementsService } from "@/services/entitlements/EntitlementsService";
import { aiKeyring } from "@/services/ai/keyring";
import type { AiRequestMeta } from "@/services/ai/AiService";
import {
  CreditCard,
  ExternalLink,
  KeyRound,
  Plus,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function maskKey(k: string) {
  const s = k.trim();
  if (s.length <= 10) return "••••••";
  return `${s.slice(0, 4)}••••••${s.slice(-4)}`;
}

const PURPOSES: { id: AiRequestMeta["purpose"]; label: string }[] = [
  { id: "transcription", label: "Transcription" },
  { id: "summarization", label: "Summarization" },
  { id: "embedding", label: "Embeddings" },
  { id: "chat_note", label: "Chat (this note)" },
  { id: "chat_global", label: "Chat (all notes)" },
  { id: "moment_cards", label: "Moment Cards" },
];

export default function ProfilePage() {
  const { preferences, setPreferences } = useAppState();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const providers = useMemo(() => listTranscriptionProviders(), []);

  const entitlementsQuery = useQuery({
    queryKey: ["entitlements"],
    queryFn: () => EntitlementsService.ensureFresh(),
    refetchInterval: 2500,
  });

  const keysQuery = useQuery({
    queryKey: ["aiKeys"],
    queryFn: async () => aiKeyring.list(),
  });

  const defaultsQuery = useQuery({
    queryKey: ["aiDefaults"],
    queryFn: async () => aiKeyring.getDefaults(),
  });

  const minutesUsed = entitlementsQuery.data?.minutesUsedThisMonth ?? 0;
  const cardsUsed = entitlementsQuery.data?.momentCardsUsedThisMonth ?? 0;

  const keys = keysQuery.data ?? [];
  const defaults = defaultsQuery.data ?? {};

  const [labelDraft, setLabelDraft] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [baseUrlDraft, setBaseUrlDraft] = useState("https://api.openai.com");

  return (
    <Screen>
      <AppHeader title="Profile" />

      <div className="mt-5 space-y-4 pb-28">
        <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
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
                onCheckedChange={(v) =>
                  setPreferences({ ...preferences, aiTrainingOptOut: v })
                }
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

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            {brand.appName} settings apply instantly across the app and Android build.
          </div>
        </Card>

        {/* AI keyring */}
        <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" />
            AI API keys
          </div>
          <div className="text-sm text-muted-foreground">
            Add multiple OpenAI-compatible keys (and optional base URLs), then choose which key to use per AI feature.
          </div>

          <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="text-sm font-semibold tracking-tight">Need a key?</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Create projects and API keys in Google AI Studio.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={brand.links.googleAiStudio}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-background px-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/40"
              >
                Google AI Studio <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={brand.links.googleAiStudioApiKeys}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-background px-3 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/40"
              >
                API keys <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-3">
            {keys.length === 0 ? (
              <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                No keys yet. Add one below to enable transcription, summaries, chat, and embeddings.
              </div>
            ) : null}

            {keys.map((k) => {
              const isDefaultAll = defaults.all === k.id;
              return (
                <div
                  key={k.id}
                  className="flex items-start justify-between gap-3 rounded-3xl border border-border/60 bg-background/60 p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold tracking-tight">{k.label}</div>
                      {isDefaultAll ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {k.baseUrl ?? "https://api.openai.com"} • {maskKey(k.apiKey)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant={isDefaultAll ? "secondary" : "default"}
                      className="h-9 rounded-2xl"
                      onClick={async () => {
                        aiKeyring.setDefaultAll(k.id);
                        await qc.invalidateQueries({ queryKey: ["aiDefaults"] });
                        toast.success("Default AI key updated");
                      }}
                    >
                      {isDefaultAll ? "Default" : "Set default"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-9 rounded-2xl px-3"
                      onClick={async () => {
                        const ok = window.confirm(
                          `Remove key “${k.label}”? This may break AI features until another key is selected.`
                        );
                        if (!ok) return;
                        aiKeyring.remove(k.id);
                        await qc.invalidateQueries({ queryKey: ["aiKeys"] });
                        await qc.invalidateQueries({ queryKey: ["aiDefaults"] });
                        toast.success("Removed");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator className="my-5" />

          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                placeholder="e.g., Personal, Work, Client A"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">API key</Label>
              <Input
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="sk-…"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Base URL (optional)</Label>
              <Input
                value={baseUrlDraft}
                onChange={(e) => setBaseUrlDraft(e.target.value)}
                placeholder="https://api.openai.com"
                className="h-11 rounded-2xl"
              />
            </div>

            <Button
              className="h-12 rounded-2xl justify-center gap-2"
              onClick={async () => {
                if (!keyDraft.trim()) {
                  toast.error("API key is required.");
                  return;
                }
                aiKeyring.add({
                  label: labelDraft.trim() || "OpenAI key",
                  apiKey: keyDraft.trim(),
                  baseUrl: baseUrlDraft.trim() || undefined,
                });
                setLabelDraft("");
                setKeyDraft("");
                setBaseUrlDraft("https://api.openai.com");
                await qc.invalidateQueries({ queryKey: ["aiKeys"] });
                await qc.invalidateQueries({ queryKey: ["aiDefaults"] });
                toast.success("Key added");
              }}
            >
              <Plus className="h-4 w-4" /> Add key
            </Button>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-3">
            <div className="text-sm font-semibold tracking-tight">Key selection</div>
            <div className="text-sm text-muted-foreground">
              Optional overrides. If unset, we use the Default key.
            </div>

            <div className="grid gap-3">
              {PURPOSES.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      Purpose: <code className="font-mono">{p.id}</code>
                    </div>
                  </div>

                  <div className="w-[220px]">
                    <Select
                      value={(defaults[p.id] ?? "") as string}
                      onValueChange={async (v) => {
                        aiKeyring.setDefaultForPurpose(
                          p.id,
                          v === "__inherit__" ? undefined : v
                        );
                        await qc.invalidateQueries({ queryKey: ["aiDefaults"] });
                        toast.success("Updated");
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-2xl">
                        <SelectValue placeholder="Inherit default" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__inherit__">Inherit default</SelectItem>
                        {keys.map((k) => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              className="h-11 rounded-2xl"
              onClick={async () => {
                // Clear all overrides.
                for (const p of PURPOSES) {
                  aiKeyring.setDefaultForPurpose(p.id, undefined);
                }
                await qc.invalidateQueries({ queryKey: ["aiDefaults"] });
                toast.success("Overrides cleared");
              }}
            >
              Clear overrides
            </Button>
          </div>
        </Card>
      </div>
    </Screen>
  );
}