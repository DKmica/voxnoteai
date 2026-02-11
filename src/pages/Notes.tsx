import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { notesRepository } from "@/data/notesRepository";
import { formatDuration } from "@/utils/format";
import { Star } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function groupLabel(createdAt: number) {
  const d = new Date(createdAt);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (d.getTime() >= startOfToday.getTime()) return "Today";
  if (d.getTime() >= startOfYesterday.getTime()) return "Yesterday";
  return "Earlier";
}

export default function NotesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: () => notesRepository.list(),
  });

  const groups = useMemo(() => {
    const notes = notesQuery.data ?? [];
    const g = new Map<string, typeof notes>();
    for (const n of notes) {
      const label = groupLabel(n.createdAt);
      g.set(label, [...(g.get(label) ?? []), n]);
    }
    return ["Today", "Yesterday", "Earlier"].map((label) => ({
      label,
      items: g.get(label) ?? [],
    }));
  }, [notesQuery.data]);

  return (
    <Screen>
      <AppHeader
        title="Notes"
        right={
          <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/app/record")}>
            New
          </Button>
        }
      />

      <div className="mt-5 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <div className="space-y-3">
              {g.items.length === 0 ? (
                <Card className="rounded-3xl border-border/60 bg-card/50 p-4 shadow-sm">
                  <div className="text-sm text-muted-foreground">No notes yet.</div>
                </Card>
              ) : null}
              {g.items.map((note) => (
                <button
                  key={note.id}
                  onClick={() => navigate(`/note/${note.id}`)}
                  className="block w-full text-left"
                >
                  <Card className="rounded-3xl border-border/60 bg-card/80 p-4 shadow-sm transition hover:bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold tracking-tight">
                          {note.titleText ?? "Untitled note"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {note.summaryText ?? "Processing…"}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="rounded-full">
                            {note.type ?? "—"}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full">
                            {formatDuration(note.durationMs)}
                          </Badge>
                          {note.tags.slice(0, 2).map((t) => (
                            <Badge key={t} variant="secondary" className="rounded-full">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="grid h-10 w-10 place-items-center rounded-2xl bg-muted/50 text-muted-foreground hover:text-primary"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await notesRepository.update({
                            ...note,
                            updatedAt: Date.now(),
                            isFavorite: !note.isFavorite,
                          });
                          await queryClient.invalidateQueries({ queryKey: ["notes"] });
                        }}
                      >
                        <Star className={note.isFavorite ? "h-5 w-5 fill-primary text-primary" : "h-5 w-5"} />
                      </button>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}