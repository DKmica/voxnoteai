import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { jobQueue } from "@/background/jobQueue";
import { notesRepository } from "@/data/notesRepository";
import type { Note } from "@/domain/models";
import { WaveformBars } from "@/features/recording/WaveformBars";
import { useRecorder } from "@/features/recording/useRecorder";
import { uuid } from "@/utils/ids";
import { formatDuration } from "@/utils/format";
import { Mic, Pause, Play, Square, Upload } from "lucide-react";
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
    processingStatus: "TRANSCRIBING",
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
    return (
      <Screen>
        <AppHeader title="Recording" />

        <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live
              </div>
              <div className="mt-1 text-3xl font-semibold tracking-tight">
                {formatDuration(recorder.elapsedMs)}
              </div>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Mic className="h-6 w-6" />
            </div>
          </div>

          <div className="mt-6 flex items-end justify-center">
            <WaveformBars level={recorder.level} className="text-primary" />
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
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
              onClick={() => (recorder.status === "paused" ? recorder.resume() : recorder.pause())}
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
                  jobQueue.enqueueTranscription(note.id);
                  await queryClient.invalidateQueries({ queryKey: ["notes"] });
                  toast.success("Saved. Transcription is running in the background.");
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
      <AppHeader title="Record" />

      <Card className="mt-5 overflow-hidden rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold tracking-tight">Today</div>
          <div className="text-xs text-muted-foreground">• {todayCount} notes</div>
        </div>

        <div className="mt-6 grid place-items-center">
          <button
            className="group relative grid h-44 w-44 place-items-center rounded-full border border-border/70 bg-primary text-primary-foreground shadow-sm transition active:scale-[0.98]"
            aria-label="Start recording"
            onClick={async () => {
              await recorder.start();
            }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
            <Mic className="relative h-10 w-10" />
            <div className="relative mt-2 text-xs font-semibold tracking-tight opacity-90">
              Tap to record
            </div>
          </button>
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
                jobQueue.enqueueTranscription(note.id);
                await queryClient.invalidateQueries({ queryKey: ["notes"] });
                toast.success("Audio imported. Transcription is running in the background.");
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