import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { jobQueue } from "@/background/jobQueue";
import { notesRepository } from "@/data/notesRepository";
import { EntitlementsService } from "@/services/entitlements/EntitlementsService";
import type { Note } from "@/domain/models";
import { WaveformBars } from "@/features/recording/WaveformBars";
import { useRecorder } from "@/features/recording/useRecorder";
import { uuid } from "@/utils/ids";
import { formatDuration } from "@/utils/format";
import {
  AudioLines,
  Mic,
  Pause,
  Play,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function createEmptyNote(params: {
  audioBlobId: string;
  durationMs: number;
}): Note {
  const now = Date.now();
  return {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    audioBlobId: params.audioBlobId,
    durationMs: params.durationMs,
    keyPoints: [],
    actionItems: [],
    tags: [],
    isFavorite: false,
    processingStatus: "RECORDED",
  };
}

export default function RecordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: () => notesRepository.list(),
  });

  const recorder = useRecorder();
  const todayCount = useMemo(() => {
    const notes = notesQuery.data ?? [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const t = startOfDay.getTime();
    return notes.filter((n) => n.createdAt >= t).length;
  }, [notesQuery.data]);

  if (recorder.status !== "idle") {
    const paused = recorder.status === "paused";

    return (
      <Screen>
        <AppHeader
          title="Recording"
          right={
            <Badge
              variant="secondary"
              className={paused ? "rounded-full" : "rounded-full"}
            >
              <span
                className={
                  paused
                    ? "mr-2 inline-block h-2 w-2 rounded-full bg-muted-foreground/70"
                    : "vox-dot mr-2 inline-block h-2 w-2 rounded-full bg-destructive"
                }
              />
              {paused ? "Paused" : "Live"}
            </Badge>
          }
        />

        <Card className="vox-card mt-5 overflow-hidden p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {paused ? "Paused" : "Recording"}
              </div>
              <div className="mt-1 text-[42px] font-semibold leading-[1] tracking-tight">
                {formatDuration(recorder.elapsedMs)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {recorder.autoPauseOnSilence
                  ? "Auto-pause on silence is enabled"
                  : "Auto-pause is disabled"}
              </div>
            </div>

            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <AudioLines className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground">
                Level
              </div>
              <div className="text-xs font-semibold text-muted-foreground">
                {paused ? "Waiting…" : "Listening"}
              </div>
            </div>
            <div className="mt-3 flex items-end justify-center">
              <WaveformBars level={recorder.level} className="text-primary" />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Auto-pause on silence</div>
              <div className="text-xs text-muted-foreground">
                {recorder.supportsPause
                  ? "Pauses when it's quiet, resumes when you speak."
                  : "Not supported in this browser."}
              </div>
            </div>
            <Switch
              checked={recorder.autoPauseOnSilence}
              disabled={!recorder.supportsPause}
              onCheckedChange={recorder.setAutoPauseOnSilence}
            />
          </div>

          {recorder.error ? (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {recorder.error}
            </div>
          ) : null}

          <Separator className="my-6" />

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="secondary"
              className="h-12 rounded-2xl justify-center gap-2"
              onClick={() =>
                recorder.status === "paused" ? recorder.resume() : recorder.pause()
              }
              disabled={!recorder.supportsPause}
            >
              {recorder.status === "paused" ? (
                <>
                  <Play className="h-4 w-4" /> Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              )}
            </Button>

            <Button
              variant="destructive"
              className="h-12 rounded-2xl justify-center gap-2"
              onClick={async () => {
                try {
                  const blob = await recorder.stop();
                  const audioBlobId = uuid();
                  const note = createEmptyNote({
                    audioBlobId,
                    durationMs: recorder.elapsedMs,
                  });
                  await notesRepository.create(note, blob);

                  const allowed = await EntitlementsService.canConsumeTranscription(
                    note.durationMs
                  );
                  if (allowed) {
                    jobQueue.enqueueTranscription(note.id);
                    toast.success("Saved. Processing runs in the background.");
                  } else {
                    await notesRepository.update({
                      ...note,
                      updatedAt: Date.now(),
                      processingStatus: "FAILED",
                      errorMessage:
                        "Free transcription minutes limit reached. Upgrade to Pro to continue.",
                    });
                    toast.message("Saved.", {
                      description:
                        "Upgrade to Pro to transcribe and summarize this recording.",
                    });
                  }

                  await queryClient.invalidateQueries({ queryKey: ["notes"] });
                  navigate(`/note/${note.id}`);
                } catch {
                  toast.error("Couldn't save recording.");
                }
              }}
            >
              <Square className="h-4 w-4" /> Stop
            </Button>

            <Button
              variant="ghost"
              className="h-12 rounded-2xl"
              onClick={() => {
                // hard cancel
                window.location.reload();
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Record"
        right={
          <Badge variant="secondary" className="rounded-full">
            Today • {todayCount}
          </Badge>
        }
      />

      <Card className="vox-card mt-5 overflow-hidden p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold tracking-tight">New recording</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Minimal capture. Background AI processing.
            </div>
          </div>
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-6 grid place-items-center">
          <button
            className="group relative grid h-48 w-48 place-items-center rounded-full border border-border/70 bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(109,94,246,0.22)] transition active:scale-[0.985]"
            aria-label="Start recording"
            onClick={async () => {
              await recorder.start();
            }}
          >
            <div className="vox-breathe absolute inset-[-10px] rounded-full bg-primary/18 blur-2xl" />
            <div className="absolute inset-2 rounded-full border border-primary-foreground/15" />
            <Mic className="relative h-11 w-11" />
            <div className="relative mt-2 text-xs font-semibold tracking-tight opacity-95">
              Tap to record
            </div>
          </button>

          <div className="mt-5 grid w-full grid-cols-3 gap-2">
            <div className="rounded-3xl border border-border/60 bg-background/70 p-3 text-center">
              <div className="text-xs font-semibold text-foreground">Auto-pause</div>
              <div className="mt-1 text-[11px] text-muted-foreground">On by default</div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-background/70 p-3 text-center">
              <div className="text-xs font-semibold text-foreground">Works offline</div>
              <div className="mt-1 text-[11px] text-muted-foreground">AI deferred</div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-background/70 p-3 text-center">
              <div className="text-xs font-semibold text-foreground">Search-ready</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Embeddings</div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            className="h-12 rounded-2xl justify-start gap-2"
            onClick={() => recorder.start()}
          >
            <Mic className="h-4 w-4" />
            New recording
          </Button>
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const audioBlobId = uuid();
                const note = createEmptyNote({ audioBlobId, durationMs: 0 });
                await notesRepository.create(note, file);

                const allowed = await EntitlementsService.canConsumeTranscription(0);
                if (allowed) {
                  jobQueue.enqueueTranscription(note.id);
                  toast.success("Audio imported. Processing runs in the background.");
                } else {
                  await notesRepository.update({
                    ...note,
                    updatedAt: Date.now(),
                    processingStatus: "FAILED",
                    errorMessage:
                      "Free transcription minutes limit reached. Upgrade to Pro to continue.",
                  });
                  toast.message("Imported.", {
                    description:
                      "Upgrade to Pro to transcribe and summarize this audio.",
                  });
                }

                await queryClient.invalidateQueries({ queryKey: ["notes"] });
                navigate(`/note/${note.id}`);
              }}
            />
            <Button
              variant="secondary"
              className="h-12 rounded-2xl justify-start gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Import audio
            </Button>
          </>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Processing runs in the background — you can navigate away anytime.
        </p>
      </Card>
    </Screen>
  );
}