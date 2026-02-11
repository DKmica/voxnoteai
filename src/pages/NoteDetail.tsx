import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { notesRepository } from "@/data/notesRepository";
import { jobQueue } from "@/background/jobQueue";
import { formatDuration, formatShortDate } from "@/utils/format";
import { ArrowLeft, FileText, RefreshCcw, Share2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const steps = [
  { key: "TRANSCRIBING", label: "Transcribing" },
  { key: "SUMMARIZING", label: "Extracting ideas" },
  { key: "READY", label: "Organizing" },
] as const;

export default function NoteDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { noteId } = useParams();
  const noteQuery = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      if (!noteId) return undefined;
      return notesRepository.get(noteId);
    },
    refetchInterval: 1200,
  });

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    (async () => {
      if (!noteQuery.data) return;
      const blob = await notesRepository.getAudioBlob(noteQuery.data);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      if (revoked) return;
      setAudioUrl(url);
    })();

    return () => {
      revoked = true;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteQuery.data?.id]);

  const meta = useMemo(() => {
    if (!noteQuery.data) return null;
    return {
      date: formatShortDate(noteQuery.data.createdAt),
      duration: formatDuration(noteQuery.data.durationMs),
    };
  }, [noteQuery.data]);

  if (!noteQuery.data) {
    return (
      <Screen>
        <AppHeader
          title="Note"
          right={
            <Button variant="ghost" className="rounded-2xl" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          }
        />
        <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </Card>
      </Screen>
    );
  }

  const note = noteQuery.data;

  const stepIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === note.processingStatus)
  );

  return (
    <Screen>
      <AppHeader
        title={note.titleText ?? "Untitled note"}
        right={
          <Button variant="ghost" className="rounded-2xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-muted-foreground">
            {meta?.date} • {meta?.duration} • {note.processingStatus}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-9 rounded-2xl px-3">
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="secondary" className="h-9 rounded-2xl px-3">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {audioUrl ? (
          <div className="mt-4">
            <audio controls className="w-full">
              <source src={audioUrl} />
            </audio>
          </div>
        ) : null}

        <Separator className="my-5" />

        {note.processingStatus === "FAILED" ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
            <div className="text-sm font-semibold text-destructive">Processing failed</div>
            <div className="mt-1 text-sm text-destructive/90">
              {note.errorMessage ?? "Unknown error."}
            </div>
            <Button
              className="mt-4 h-11 rounded-2xl"
              onClick={async () => {
                jobQueue.enqueueTranscription(note.id);
                await notesRepository.update({
                  ...note,
                  updatedAt: Date.now(),
                  processingStatus: "TRANSCRIBING",
                  errorMessage: undefined,
                });
                await queryClient.invalidateQueries({ queryKey: ["note", noteId] });
              }}
            >
              <RefreshCcw className="h-4 w-4" /> Retry
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" />
              AI processing
            </div>
            <div className="mt-3 space-y-2">
              {steps.map((s, idx) => (
                <div key={s.key} className="flex items-center justify-between">
                  <div className="text-sm text-foreground/90">{s.label}</div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {idx < stepIndex ? "Done" : idx === stepIndex ? "In progress" : "Queued"}
                  </div>
                </div>
              ))}
            </div>
            {note.transcriptText ? (
              <div className="mt-4 rounded-2xl bg-card/60 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Transcript (preview)
                </div>
                <div className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {note.transcriptText.slice(0, 380)}
                  {note.transcriptText.length > 380 ? "…" : ""}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </Screen>
  );
}