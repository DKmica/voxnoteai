import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { notesRepository } from "@/data/notesRepository";
import { embeddingsRepository } from "@/data/embeddingsRepository";
import type { Note, NoteType } from "@/domain/models";
import { getEmbeddingProvider } from "@/services/embeddings/providerRegistry";
import { cosineSimilarity } from "@/utils/vector";
import { formatShortDate } from "@/utils/format";
import { useAppState } from "@/state/AppStateProvider";
import { Calendar, Filter, MessageSquare, Search, Sparkles, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

type Filters = {
  from?: string; // yyyy-mm-dd
  to?: string; // yyyy-mm-dd
  type?: NoteType;
  tags?: string[];
  favoritesOnly: boolean;
};

type Scored = {
  note: Note;
  score: number;
  semantic: number;
  keyword: number;
};

function parseDay(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function keywordScore(query: string, note: Note) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return 0;

  const title = (note.titleText ?? "").toLowerCase();
  const summary = (note.summaryText ?? "").toLowerCase();
  const transcript = (note.transcriptText ?? "").toLowerCase();

  const t = title.includes(q) ? 1 : 0;
  const s = summary.includes(q) ? 0.7 : 0;
  const tr = transcript.includes(q) ? 0.5 : 0;
  return Math.min(1, t + s + tr);
}

function snippet(note: Note) {
  return (
    note.summaryText ??
    note.transcriptText?.slice(0, 140) ??
    "Processing…"
  );
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { featureFlags } = useAppState();

  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: () => notesRepository.list(),
  });

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    favoritesOnly: false,
  });

  const [results, setResults] = useState<Scored[]>([]);
  const [running, setRunning] = useState(false);

  const filteredNotes = useMemo(() => {
    const notes = notesQuery.data ?? [];
    const fromT = parseDay(filters.from);
    const toT = parseDay(filters.to);

    return notes.filter((n) => {
      if (filters.favoritesOnly && !n.isFavorite) return false;
      if (filters.type && n.type !== filters.type) return false;
      if (filters.tags && filters.tags.length) {
        const has = filters.tags.every((t) => n.tags.includes(t));
        if (!has) return false;
      }
      if (fromT != null && n.createdAt < fromT) return false;
      if (toT != null) {
        const end = toT + 24 * 60 * 60 * 1000;
        if (n.createdAt >= end) return false;
      }
      return true;
    });
  }, [notesQuery.data, filters]);

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        return;
      }

      setRunning(true);
      try {
        const provider = getEmbeddingProvider();
        const qEmb = await provider.embedText(q);
        const embeddings = await embeddingsRepository.list();
        const embById = new Map(embeddings.map((e) => [e.noteId, e]));

        const scored: Scored[] = filteredNotes
          .map((n) => {
            const e = embById.get(n.id);
            const semantic = e ? cosineSimilarity(qEmb.vector, e.vector) : 0;
            const keyword = keywordScore(q, n);
            const score = semantic * 0.78 + keyword * 0.22;
            return { note: n, score, semantic, keyword };
          })
          .filter((r) => r.score > 0.08)
          .sort((a, b) => b.score - a.score)
          .slice(0, 30);

        if (!alive) return;
        setResults(scored);
      } catch {
        // Fallback: keyword only
        const scored: Scored[] = filteredNotes
          .map((n) => {
            const keyword = keywordScore(query, n);
            return { note: n, score: keyword, semantic: 0, keyword };
          })
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 30);

        if (!alive) return;
        setResults(scored);
      } finally {
        if (alive) setRunning(false);
      }
    }, 260);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [query, filteredNotes]);

  const activeFilterCount =
    (filters.favoritesOnly ? 1 : 0) +
    (filters.type ? 1 : 0) +
    ((filters.tags?.length ?? 0) > 0 ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0);

  return (
    <Screen>
      <AppHeader title="Search" />

      <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes (semantic + keyword)"
              className="h-11 rounded-2xl pl-9"
            />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" className="h-11 rounded-2xl px-3">
                <Filter className="h-4 w-4" />
                {activeFilterCount ? (
                  <span className="ml-1 text-xs font-semibold">{activeFilterCount}</span>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>

              <div className="mt-4 grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <div className="relative mt-2">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={filters.from ?? ""}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, from: e.target.value || undefined }))
                        }
                        className="h-11 rounded-2xl pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <div className="relative mt-2">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        value={filters.to ?? ""}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, to: e.target.value || undefined }))
                        }
                        className="h-11 rounded-2xl pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select
                    value={filters.type ?? "ALL"}
                    onValueChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        type: v === "ALL" ? undefined : (v as NoteType),
                      }))
                    }
                  >
                    <SelectTrigger className="mt-2 h-11 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="IDEA">Idea</SelectItem>
                      <SelectItem value="TASK">Task</SelectItem>
                      <SelectItem value="MEETING">Meeting</SelectItem>
                      <SelectItem value="JOURNAL">Journal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Tags (comma separated)</Label>
                  <Input
                    className="mt-2 h-11 rounded-2xl"
                    value={(filters.tags ?? []).join(", ")}
                    onChange={(e) => {
                      const next = e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean);
                      setFilters((f) => ({ ...f, tags: next.length ? next : undefined }));
                    }}
                    placeholder="e.g., roadmap, hiring"
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">Favorites only</div>
                    <div className="text-xs text-muted-foreground">
                      Show starred notes.
                    </div>
                  </div>
                  <Checkbox
                    checked={filters.favoritesOnly}
                    onCheckedChange={(v) =>
                      setFilters((f) => ({ ...f, favoritesOnly: Boolean(v) }))
                    }
                  />
                </div>

                <Separator />

                <Button
                  variant="secondary"
                  className="h-11 rounded-2xl"
                  onClick={() => setFilters({ favoritesOnly: false })}
                >
                  Clear filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Semantic
          </Badge>
          <Badge variant="secondary" className="rounded-full">
            Keyword fallback
          </Badge>
          {featureFlags.globalChat ? (
            <Button
              variant="secondary"
              className="ml-auto h-9 rounded-2xl gap-2"
              onClick={() => navigate("/chat?mode=global")}
            >
              <MessageSquare className="h-4 w-4" /> Chat
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="mt-6 space-y-3 pb-28">
        {running ? (
          <Card className="rounded-3xl border-border/60 bg-card/50 p-4 shadow-sm">
            <div className="text-sm text-muted-foreground">Searching…</div>
          </Card>
        ) : null}

        {!running && query.trim() && results.length === 0 ? (
          <Card className="rounded-3xl border-border/60 bg-card/50 p-4 shadow-sm">
            <div className="text-sm font-semibold tracking-tight">No matches</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Try a different phrase or record a new note.
            </div>
          </Card>
        ) : null}

        {results.map((r) => (
          <button
            key={r.note.id}
            onClick={() => navigate(`/note/${r.note.id}`)}
            className="block w-full text-left"
          >
            <Card className="rounded-3xl border-border/60 bg-card/80 p-4 shadow-sm transition hover:bg-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold tracking-tight">
                    {r.note.titleText ?? "Untitled note"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatShortDate(r.note.createdAt)} • {snippet(r.note)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.note.isFavorite ? (
                      <Badge variant="secondary" className="rounded-full gap-1">
                        <Star className="h-3.5 w-3.5" /> Favorite
                      </Badge>
                    ) : null}
                    {r.note.type ? (
                      <Badge variant="secondary" className="rounded-full">
                        {r.note.type}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="rounded-full">
                      Score {r.score.toFixed(2)}
                    </Badge>
                    {r.note.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-right text-[11px] font-semibold text-muted-foreground">
                  <div>sem {r.semantic.toFixed(2)}</div>
                  <div>kw {r.keyword.toFixed(2)}</div>
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </Screen>
  );
}
