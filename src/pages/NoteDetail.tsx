import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/state/AppStateProvider";
import { Capacitor } from "@capacitor/core";
import { notesRepository } from "@/data/notesRepository";
import { momentCardsRepository } from "@/data/momentCardsRepository";
import { jobQueue } from "@/background/jobQueue";
import { EntitlementsService } from "@/services/entitlements/EntitlementsService";
import { getMomentCardQuotesProvider } from "@/services/momentCards/providerRegistry";
import { renderMomentCardPng } from "@/features/momentCards/renderMomentCard";
import type { MomentCardTheme, NoteType } from "@/domain/models";
import { uuid } from "@/utils/ids";
import { formatDuration, formatShortDate } from "@/utils/format";
import {
  ArrowLeft,
  Download,
  FileText,
  MessageSquare,
  RefreshCcw,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const flowSteps = [
  { key: "TRANSCRIBING", label: "Transcribing" },
  { key: "SUMMARIZING", label: "Extracting ideas" },
  { key: "READY", label: "Organizing" },
] as const;

function toMd(note: {
  titleText?: string;
  summaryText?: string;
  keyPoints: string[];
  actionItems: { text: string; checked: boolean }[];
  tags: string[];
  type?: string;
  transcriptText?: string;
}) {
  const lines: string[] = [];
  lines.push(`# ${note.titleText ?? "Untitled"}`);
  lines.push("");
  if (note.summaryText) {
    lines.push("## Summary");
    lines.push(note.summaryText);
    lines.push("");
  }
  if (note.keyPoints.length) {
    lines.push("## Key points");
    for (const p of note.keyPoints) lines.push(`- ${p}`);
    lines.push("");
  }
  if (note.actionItems.length) {
    lines.push("## Action items");
    for (const a of note.actionItems)
      lines.push(`- [${a.checked ? "x" : " "}] ${a.text}`);
    lines.push("");
  }
  if (note.tags.length) {
    lines.push("## Tags");
    lines.push(note.tags.map((t) => `#${t.replace(/\s+/g, "_")}`).join(" "));
    lines.push("");
  }
  if (note.type) {
    lines.push(`Type: ${note.type}`);
    lines.push("");
  }
  if (note.transcriptText) {
    lines.push("---");
    lines.push("## Transcript");
    lines.push(note.transcriptText);
    lines.push("");
  }
  return lines.join("\n");
}

function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function openPrintableNoteHtml(title: string, markdownText: string) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto;max-width:780px;margin:40px auto;line-height:1.45;color:#111827}h1{font-size:28px}h2{margin-top:22px}</style>
    </head><body><pre style="white-space:pre-wrap">${escapeHtml(markdownText)}</pre></body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
  return true;
}

function MomentCardThumb({
  card,
  onShare,
  onDelete,
}: {
  card: { id: string; theme: MomentCardTheme; quoteText: string; imageBlobId: string };
  onShare: (cardId: string) => void;
  onDelete: (cardId: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    (async () => {
      const blob = await momentCardsRepository.getImageBlob(card as any);
      if (!blob) return;
      const u = URL.createObjectURL(blob);
      if (revoked) return;
      setUrl(u);
    })();

    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  return (
    <div className="w-[180px] shrink-0">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
        {url ? (
          <img src={url} alt="Moment card" className="h-[225px] w-full object-cover" />
        ) : (
          <div className="grid h-[225px] w-full place-items-center text-xs text-muted-foreground">
            Loading…
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          variant="secondary"
          className="h-9 flex-1 rounded-2xl"
          onClick={() => onShare(card.id)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          className="h-9 rounded-2xl px-3"
          onClick={() => onDelete(card.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function NoteDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { noteId } = useParams();
  const { preferences, featureFlags } = useAppState();

  const noteQuery = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      if (!noteId) return undefined;
      return notesRepository.get(noteId);
    },
    refetchInterval: 1200,
  });

  const momentCardsQuery = useQuery({
    queryKey: ["momentCards", noteId],
    queryFn: async () => {
      if (!noteId) return [];
      return momentCardsRepository.listForNote(noteId);
    },
    enabled: !!noteId,
  });

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");

  // Moment card dialog state
  const [mcOpen, setMcOpen] = useState(false);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcQuotes, setMcQuotes] = useState<string[]>([]);
  const [mcSelectedQuote, setMcSelectedQuote] = useState<string>("");
  const [mcTheme, setMcTheme] = useState<MomentCardTheme>("MINIMAL");

  useEffect(() => {
    if (!noteQuery.data) return;
    setTitleDraft(noteQuery.data.titleText ?? "");
  }, [noteQuery.data?.id, noteQuery.data?.titleText]);

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

  const stepIndex = (() => {
    if (note.processingStatus === "RECORDED") return -1;
    return flowSteps.findIndex((s) => s.key === note.processingStatus);
  })();

  const canShowAiCards = note.processingStatus === "READY";

  async function persist(update: Partial<typeof note>) {
    await notesRepository.update({ ...note, ...update, updatedAt: Date.now() });
    await queryClient.invalidateQueries({ queryKey: ["note", noteId] });
    await queryClient.invalidateQueries({ queryKey: ["notes"] });
  }

  async function shareText(text: string) {
    try {
      if (navigator.share) {
        await navigator.share({ title: note.titleText ?? "VoxNote", text });
        return;
      }
    } catch {
      // ignore
    }
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <Screen>
      <AppHeader
        title={canShowAiCards ? "Note" : "Processing"}
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-9 rounded-2xl px-3"
              onClick={async () => {
                await persist({ isFavorite: !note.isFavorite });
              }}
            >
              <Star
                className={
                  note.isFavorite
                    ? "h-4 w-4 fill-primary text-primary"
                    : "h-4 w-4"
                }
              />
            </Button>
            <Button
              variant="ghost"
              className="h-9 rounded-2xl px-3"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-muted-foreground">
            {meta?.date} • {meta?.duration}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {note.type ? (
              <Badge variant="secondary" className="rounded-full">
                {note.type}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="rounded-full">
              {note.processingStatus}
            </Badge>
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
            <div className="text-sm font-semibold text-destructive">Processing paused</div>
            <div className="mt-1 text-sm text-destructive/90">
              {note.errorMessage ?? "Unknown error."}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                className="h-11 rounded-2xl"
                onClick={() => navigate("/paywall")}
              >
                <Sparkles className="h-4 w-4" /> Upgrade
              </Button>
              <Button
                variant="secondary"
                className="h-11 rounded-2xl"
                onClick={async () => {
                  jobQueue.enqueueTranscription(note.id);
                  await persist({
                    processingStatus: "RECORDED",
                    errorMessage: undefined,
                  });
                  toast.success("Queued. Processing will resume in the background.");
                }}
              >
                <RefreshCcw className="h-4 w-4" /> Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" />
              AI processing
            </div>
            <div className="mt-3 space-y-2">
              {flowSteps.map((s, idx) => {
                const status =
                  note.processingStatus === "RECORDED"
                    ? "Queued"
                    : idx < stepIndex
                      ? "Done"
                      : idx === stepIndex
                        ? "In progress"
                        : "Queued";
                return (
                  <div key={s.key} className="flex items-center justify-between">
                    <div className="text-sm text-foreground/90">{s.label}</div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      {status}
                    </div>
                  </div>
                );
              })}
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

            {note.processingStatus === "RECORDED" ? (
              <div className="mt-4 flex gap-2">
                <Button
                  className="h-11 rounded-2xl"
                  onClick={async () => {
                    const allowed = await EntitlementsService.canConsumeTranscription(
                      note.durationMs
                    );
                    if (!allowed) {
                      toast.message("Limit reached", {
                        description: "Upgrade to Pro to process more minutes.",
                      });
                      navigate("/paywall");
                      return;
                    }
                    jobQueue.enqueueTranscription(note.id);
                    toast.success("Queued. You can leave this screen.");
                  }}
                >
                  <Sparkles className="h-4 w-4" /> Start processing
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* AI-enhanced cards */}
      <div className="mt-6 space-y-4 pb-28">
        <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Title
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Editable — used for search and exports.
              </div>
            </div>
            {featureFlags.globalChat ? (
              <Button
                variant="secondary"
                className="h-10 rounded-2xl gap-2"
                onClick={() => navigate(`/chat?mode=note&noteId=${note.id}`)}
              >
                <MessageSquare className="h-4 w-4" /> Ask AI
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex gap-2">
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="Give this note a memorable title…"
              className="h-11 flex-1 rounded-2xl"
            />
            <Button
              className="h-11 rounded-2xl"
              onClick={async () => {
                await persist({ titleText: titleDraft.trim() || undefined });
                toast.success("Title saved");
              }}
            >
              Save
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Summary
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {canShowAiCards
                  ? "AI-generated. Edit if needed."
                  : "Available after processing."}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Textarea
              value={note.summaryText ?? ""}
              placeholder="Summary will appear here…"
              className="min-h-[110px] rounded-2xl"
              onChange={(e) => persist({ summaryText: e.target.value })}
              disabled={!canShowAiCards}
            />
          </div>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key points
          </div>
          <div className="mt-3 space-y-2">
            {note.keyPoints.length === 0 ? (
              <div className="text-sm text-muted-foreground">—</div>
            ) : null}
            {note.keyPoints.map((p, idx) => (
              <div key={idx} className="rounded-2xl bg-muted/40 px-4 py-3 text-sm">
                {p}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Action items
          </div>
          <div className="mt-3 space-y-2">
            {note.actionItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">No action items.</div>
            ) : null}
            {note.actionItems.map((a, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-2xl bg-muted/40 px-4 py-3"
              >
                <Checkbox
                  checked={a.checked}
                  onCheckedChange={async (v) => {
                    const next = [...note.actionItems];
                    next[idx] = { ...a, checked: Boolean(v) };
                    await persist({ actionItems: next });
                  }}
                />
                <div className={a.checked ? "text-sm line-through opacity-70" : "text-sm"}>
                  {a.text}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="grid gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {note.tags.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tags.</div>
                ) : null}
                {note.tags.map((t) => (
                  <button
                    key={t}
                    className="group"
                    onClick={async () => {
                      await persist({ tags: note.tags.filter((x) => x !== t) });
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className="rounded-full transition group-hover:bg-destructive/10 group-hover:text-destructive"
                    >
                      {t}
                      <span className="ml-1.5 opacity-70">×</span>
                    </Badge>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  placeholder="Add tag (e.g., roadmap)"
                  className="h-11 rounded-2xl"
                  onKeyDown={async (e) => {
                    if (e.key !== "Enter") return;
                    const next = tagDraft.trim();
                    if (!next) return;
                    if (note.tags.includes(next)) return setTagDraft("");
                    await persist({ tags: [...note.tags, next] });
                    setTagDraft("");
                  }}
                />
                <Button
                  variant="secondary"
                  className="h-11 rounded-2xl"
                  onClick={async () => {
                    const next = tagDraft.trim();
                    if (!next) return;
                    if (note.tags.includes(next)) return setTagDraft("");
                    await persist({ tags: [...note.tags, next] });
                    setTagDraft("");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={note.type ?? "IDEA"}
                  onValueChange={(v) => persist({ type: v as NoteType })}
                  disabled={!canShowAiCards}
                >
                  <SelectTrigger className="mt-2 h-11 rounded-2xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDEA">Idea</SelectItem>
                    <SelectItem value="TASK">Task</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="JOURNAL">Journal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    className="mt-7 h-11 rounded-2xl justify-start gap-2"
                  >
                    <Download className="h-4 w-4" /> Export
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Export note</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <Button
                      className="h-11 rounded-2xl justify-start gap-2"
                      onClick={() =>
                        downloadText(
                          `${(note.titleText ?? "note").slice(0, 40)}.txt`,
                          toMd(note),
                          "text/plain"
                        )
                      }
                    >
                      <FileText className="h-4 w-4" /> TXT
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-11 rounded-2xl justify-start gap-2"
                      onClick={() =>
                        downloadText(
                          `${(note.titleText ?? "note").slice(0, 40)}.md`,
                          toMd(note),
                          "text/markdown"
                        )
                      }
                    >
                      <FileText className="h-4 w-4" /> Markdown
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-11 rounded-2xl justify-start gap-2"
                      onClick={async () => {
                        const markdown = toMd(note);
                        if (Capacitor.isNativePlatform()) {
                          await shareText(markdown);
                          toast.success("Shared note text for PDF/save in your target app.");
                          return;
                        }

                        const opened = openPrintableNoteHtml(
                          note.titleText ?? "Note",
                          markdown
                        );
                        if (!opened) {
                          await shareText(markdown);
                        }
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      {Capacitor.isNativePlatform() ? "Share for PDF" : "PDF (print)"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        {/* Moment Cards */}
        {featureFlags.momentCards && note.transcriptText ? (
          <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AI Moment Cards
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Turn a quotable insight into a shareable card.
                </div>
              </div>

              <Dialog open={mcOpen} onOpenChange={setMcOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="h-10 rounded-2xl gap-2"
                    onClick={async () => {
                      setMcOpen(true);
                      setMcLoading(true);
                      try {
                        const provider = getMomentCardQuotesProvider();
                        const res = await provider.extractQuotes(note.transcriptText ?? "");
                        const quotes = (res.quotes ?? []).slice(0, 3);
                        setMcQuotes(quotes);
                        setMcSelectedQuote(quotes[0] ?? "");
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Couldn't extract quotes."
                        );
                        setMcQuotes([]);
                        setMcSelectedQuote("");
                      } finally {
                        setMcLoading(false);
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4" /> Create
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md rounded-3xl">
                  <DialogHeader>
                    <DialogTitle>Create Moment Card</DialogTitle>
                  </DialogHeader>

                  {mcLoading ? (
                    <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                      Extracting quotes…
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Quote
                        </div>
                        <div className="grid gap-2">
                          {mcQuotes.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              No quotable lines found.
                            </div>
                          ) : null}
                          {mcQuotes.map((q) => (
                            <button
                              key={q}
                              className={
                                mcSelectedQuote === q
                                  ? "rounded-2xl border border-primary/40 bg-primary/10 p-3 text-left text-sm"
                                  : "rounded-2xl border border-border/60 bg-card p-3 text-left text-sm hover:bg-muted/30"
                              }
                              onClick={() => setMcSelectedQuote(q)}
                            >
                              "{q}"
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {([
                          ["MINIMAL", "Minimal"],
                          ["BOLD", "Bold"],
                          ["CALM", "Calm"],
                        ] as const).map(([id, label]) => (
                          <button
                            key={id}
                            className={
                              mcTheme === id
                                ? "h-11 rounded-2xl border border-primary/40 bg-primary/10 text-sm font-semibold"
                                : "h-11 rounded-2xl border border-border/60 bg-card text-sm font-semibold hover:bg-muted/30"
                            }
                            onClick={() => setMcTheme(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <Button
                        className="h-12 rounded-2xl"
                        disabled={!mcSelectedQuote || mcLoading || mcQuotes.length === 0 || mcLoading}
                        onClick={async () => {
                          setMcLoading(true);
                          try {
                            const allowed = await EntitlementsService.canCreateMomentCard();
                            if (!allowed) {
                              toast.message("Limit reached", {
                                description:
                                  "Free Moment Cards limit reached. Upgrade to Pro to continue.",
                              });
                              setMcOpen(false);
                              navigate("/paywall");
                              return;
                            }

                            const watermark = !preferences.proEnabled;
                            const blob = await renderMomentCardPng({
                              quote: mcSelectedQuote,
                              theme: mcTheme,
                              watermark,
                            });

                            const imageBlobId = uuid();
                            const card = {
                              id: uuid(),
                              noteId: note.id,
                              quoteText: mcSelectedQuote,
                              theme: mcTheme,
                              createdAt: Date.now(),
                              imageBlobId,
                            };

                            await momentCardsRepository.create(card, blob);
                            await EntitlementsService.consumeMomentCard();

                            toast.success("Moment Card created");
                            setMcOpen(false);
                            await queryClient.invalidateQueries({
                              queryKey: ["momentCards", note.id],
                            });
                            await queryClient.invalidateQueries({ queryKey: ["entitlements"] });
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : "Couldn't create Moment Card."
                            );
                          } finally {
                            setMcLoading(false);
                          }
                        }}
                      >
                        Generate PNG
                      </Button>

                      {!preferences.proEnabled ? (
                        <div className="rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">
                          Free tier adds a small watermark. Pro removes it.
                        </div>
                      ) : null}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <Separator className="my-5" />

            <div className="flex gap-3 overflow-x-auto pb-2">
              {(momentCardsQuery.data ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No Moment Cards yet.
                </div>
              ) : null}
              {(momentCardsQuery.data ?? []).map((c) => (
                <MomentCardThumb
                  key={c.id}
                  card={c}
                  onShare={async (cardId) => {
                    const card = (momentCardsQuery.data ?? []).find((x) => x.id === cardId);
                    if (!card) return;
                    const blob = await momentCardsRepository.getImageBlob(card);
                    if (!blob) return;

                    const file = new File([blob], `moment-card-${card.id}.png`, {
                      type: "image/png",
                    });

                    try {
                      // Prefer native share.
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const nav: any = navigator;
                      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
                        await nav.share({
                          title: "Moment Card",
                          files: [file],
                        });
                        return;
                      }
                    } catch {
                      // ignore
                    }

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `moment-card-${card.id}.png`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 250);
                  }}
                  onDelete={async (cardId) => {
                    const card = (momentCardsQuery.data ?? []).find((x) => x.id === cardId);
                    if (!card) return;
                    await momentCardsRepository.delete(card);
                    toast.success("Deleted");
                    await queryClient.invalidateQueries({
                      queryKey: ["momentCards", note.id],
                    });
                  }}
                />
              ))}
            </div>
          </Card>
        ) : null}

        {/* Transcript */}
        <Card className="rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transcript
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {note.transcriptText ? "Editable" : "Available after transcription."}
              </div>
            </div>
            <Button
              variant="secondary"
              className="h-10 rounded-2xl gap-2"
              onClick={() => shareText(toMd(note))}
            >
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
          <div className="mt-4">
            <Textarea
              value={note.transcriptText ?? ""}
              placeholder="Transcript will appear here…"
              className="min-h-[180px] rounded-2xl"
              onChange={(e) => persist({ transcriptText: e.target.value })}
              disabled={!note.transcriptText}
            />
          </div>
        </Card>
      </div>
    </Screen>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}
