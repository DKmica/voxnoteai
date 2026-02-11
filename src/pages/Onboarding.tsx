import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { brand } from "@/config/brand";
import { strings } from "@/config/strings";
import { useAppState } from "@/state/AppStateProvider";
import { Bell, ExternalLink, Lock, Mic } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type Step = 0 | 1 | 2;

export default function Onboarding() {
  const navigate = useNavigate();
  const { preferences, setPreferences } = useAppState();
  const [step, setStep] = useState<Step>(0);
  const [micGranted, setMicGranted] = useState<boolean>(false);

  const steps = useMemo(
    () =>
      [
        {
          icon: Mic,
          title: strings.onboarding.valueTitle,
          body: strings.onboarding.valueBody,
          visual: (
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
              <div className="absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />

              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {brand.appName}
                  </div>
                  <div className="mt-1 text-lg font-semibold tracking-tight">
                    Today's insights, automatically
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Record → transcribe → summarize → organize
                  </div>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Mic className="h-6 w-6" />
                </div>
              </div>
              <div className="relative mt-4 grid grid-cols-3 gap-2">
                {["Summary", "Key points", "Action items"].map((t) => (
                  <div
                    key={t}
                    className="rounded-2xl bg-muted/60 px-3 py-2 text-xs font-medium text-foreground/80"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          icon: Lock,
          title: strings.onboarding.privacyTitle,
          body: strings.onboarding.privacyBody,
          visual: (
            <div className="rounded-3xl border border-border/60 bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold tracking-tight">
                    Control what leaves your device
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Toggle AI training opt-out anytime. Export or delete your data in one tap.
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">AI training opt-out</div>
                  <div className="text-xs text-muted-foreground">
                    Adds an opt-out flag to requests when supported.
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
          ),
        },
        {
          icon: Bell,
          title: strings.onboarding.permissionsTitle,
          body: strings.onboarding.permissionsBody,
          visual: (
            <div className="rounded-3xl border border-border/60 bg-card p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">Microphone</div>
                    <div className="text-xs text-muted-foreground">Required</div>
                  </div>
                  <Button
                    variant={micGranted ? "secondary" : "default"}
                    className="rounded-2xl"
                    onClick={async () => {
                      try {
                        await navigator.mediaDevices.getUserMedia({ audio: true });
                        setMicGranted(true);
                      } catch {
                        setMicGranted(false);
                      }
                    }}
                  >
                    {micGranted ? "Granted" : "Grant"}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">Notifications</div>
                    <div className="text-xs text-muted-foreground">Optional</div>
                  </div>
                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={async () => {
                      if (!("Notification" in window)) return;
                      try {
                        const res = await Notification.requestPermission();
                        setPreferences({
                          ...preferences,
                          notificationsEnabled: res === "granted",
                        });
                      } catch {
                        setPreferences({ ...preferences, notificationsEnabled: false });
                      }
                    }}
                  >
                    {preferences.notificationsEnabled ? "Enabled" : "Enable"}
                  </Button>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-sm font-semibold">Optional: get an AI key</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    For cloud transcription, summaries, chat, and embeddings.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={brand.links.googleAiStudio}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-2xl bg-muted/40 px-3 text-sm font-semibold hover:bg-muted/60"
                    >
                      Google AI Studio <ExternalLink className="h-4 w-4" />
                    </a>
                    <a
                      href={brand.links.googleAiStudioApiKeys}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-2xl bg-muted/40 px-3 text-sm font-semibold hover:bg-muted/60"
                    >
                      API keys <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ),
        },
      ] as const,
    [preferences, setPreferences, micGranted]
  );

  const { icon: Icon, title, body, visual } = steps[step];

  return (
    <Screen className="pt-8">
      <div className="flex min-h-[70vh] flex-col">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-muted-foreground">Welcome to</div>
          <div className="text-xs font-semibold text-muted-foreground">
            {step + 1} / {steps.length}
          </div>
        </div>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {brand.appName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{brand.tagline}</p>

        <Card className="mt-6 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">{title}</div>
              <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </div>
            </div>
          </div>
          <div className="mt-4">{visual}</div>
        </Card>

        <div className="mt-auto pt-6">
          <div className="flex gap-3">
            {step > 0 ? (
              <Button
                variant="secondary"
                className="w-full rounded-2xl"
                onClick={() => setStep((s) => (s - 1) as Step)}
              >
                Back
              </Button>
            ) : null}
            <Button
              className="w-full rounded-2xl"
              onClick={() => {
                if (step < 2) return setStep((s) => (s + 1) as Step);
                setPreferences({ ...preferences, onboardingCompleted: true });
                navigate("/app/record", { replace: true });
              }}
            >
              {step < 2 ? "Continue" : "Start"}
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            By continuing you agree to a placeholder Privacy Policy.
          </p>
        </div>
      </div>
    </Screen>
  );
}