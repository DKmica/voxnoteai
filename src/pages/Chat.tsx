import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { notesRepository } from "@/data/notesRepository";
import { embeddingsRepository } from "@/data/embeddingsRepository";
import type { Note } from "@/domain/models";
import { getEmbeddingProvider } from "@/services/embeddings/providerRegistry";
import { cosineSimilarity } from "@/utils/vector";
import { chatWithNotes, type ChatMessage, type ChatMode } from "@/services/chat/ChatService";
import { useAppState } from "@/state/AppStateProvider";
import { cn } from "@/lib/utils";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const suggestedPrompts = [
  "What were my key decisions this week?",
  "Summarize my action items",
  "What should I follow up on next?",
  "Draft a short status update",
] as const;

function compact(t: string, max = 520) {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

async function retrieveTopNotes(query: string, notes: Note[], topK = 4) {
  const provider = getEmbeddingProvider();
  const queryEmb = await provider.embedText(query);
  const embeddings = await embeddingsRepository.list();
  const embById = new Map(embeddings.map((e) => [e.noteId, e]));

  const scored = notes
    .map((n) => {
      const e = embById.get(n.id);
      const semantic = e ? cosineSimilarity(queryEmb.vector, e.vector) : 0;
      const hay = `${n.titleText ?? ""}\n${n.summaryText ?? ""}\n${n.transcriptText ?? ""}`.toLowerCase();
      const q = query.toLowerCase().trim();
      const keyword = q.length >= 3 && hay.includes(q) ? 0.22 : 0;
      return { note: n, score: semantic * 0.78 + keyword };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.filter((s) => s.score > 0.08).map((s) => s.note);
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { featureFlags } = useAppState();
  const [sp] = useSearchParams();

  const mode = (sp.get("mode") === "note" ? "note" : "global") as ChatMode;
  const noteId = sp.get("noteId") ?? undefined;

  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: () => notesRepository.list(),
  });

  const note = useMemo(() => {
    if (!noteId) return undefined;
    return (notesQuery.data ?? []).find((n) => n.id === noteId);
  }, [notesQuery.data, noteId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const title = mode === "note" ? "This note" : "All notes";

  async function send(text: string) {
    const q = text.trim();
    if (!q) return;

    if (!featureFlags.globalChat && mode === "global") {
      toast.message("Global chat is disabled by feature flags.");
      return;
    }

    if (mode === "note" && !note) {
      toast.error("Note not found.");
      return;
    }

    setDraft("");
    const next: ChatMessage[] = [...messages, { role: "user" as const, content: q }];
    setMessages(next);

    setBusy(true);

    try {
      const all = notesQuery.data ?? [];
      const contextNotes =
        mode === "note"
          ? [
              {
                id: note!.id,
                title: note!.titleText ?? "Untitled note",
                createdAt: note!.createdAt,
                summary: compact(note!.summaryText ?? "", 480),
                transcript: compact(note!.transcriptText ?? "", 1200),
              },
            ]
          : (await retrieveTopNotes(q, all, 5)).map((n) => ({
              id: n.id,
              title: n.titleText ?? "Untitled note",
              createdAt: n.createdAt,
              summary: compact(n.summaryText ?? "", 420),
              transcript: compact(n.transcriptText ?? "", 900),
            }));

      if (mode === "global" && contextNotes.length === 0) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant" as const,
            content:
              "I couldn't find anything relevant in your notes yet. Try recording a quick note about this topic, then ask again.",
          },
        ]);

        return;
      }

      const reply = await chatWithNotes({
        mode,
        notes: contextNotes,
        messages: next,
      });

      setMessages((m) => [...m, { role: "assistant" as const, content: reply }]);

    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title="Chat"
        right={
          <Button variant="ghost" className="rounded-2xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold tracking-tight">{title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {mode === "note"
                ? "Scoped chat — answers must come from this note only."
                : "We retrieve top-matching notes as context."
              }
            </div>
          </div>
          <Badge variant="secondary" className="rounded-full">
            Grounded
          </Badge>
        </div>

        {mode === "note" && note ? (
          <div className="mt-3 rounded-2xl bg-muted/40 p-3">
            <div className="text-xs font-semibold text-muted-foreground">Using note</div>
            <div className="mt-1 text-sm font-semibold tracking-tight">
              {note.titleText ?? "Untitled note"}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestedPrompts.map((p) => (
            <button
              key={p}
              className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-foreground/90 hover:bg-muted/40"
              onClick={() => send(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-5 space-y-3 pb-28">
        {messages.length === 0 ? (
          <Card className="rounded-3xl border-border/60 bg-card/60 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight">Ask anything</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Try a question, or tap a suggestion.
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {messages.map((m, idx) => (
          <div
            key={idx}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border/60"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy ? (
          <div className="text-center text-xs text-muted-foreground">Thinking…</div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto w-full max-w-md px-4">
        <Card className="rounded-3xl border-border/60 bg-background/90 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your notes…"
              className="h-11 rounded-2xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") send(draft);
              }}
            />
            <Button className="h-11 rounded-2xl" onClick={() => send(draft)} disabled={busy}>
              Send
            </Button>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Uses your saved OpenAI key (local). {mode === "global" ? "Retrieval + chat" : "Note chat"}.
            </span>
            <button className="underline" onClick={() => navigate("/app/profile")}>
              Keys
            </button>
          </div>
        </Card>
      </div>
    </Screen>
  );
}
