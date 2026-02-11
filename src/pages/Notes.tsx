import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { notesRepository } from "@/data/notesRepository";
import { useLongPress } from "@/components/notes/useLongPress";
import { SwipeableNoteRow } from "@/components/notes/SwipeableNoteRow";
import { Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const selectedNotes = useMemo(() => {
    const byId = new Map((notesQuery.data ?? []).map((n) => [n.id, n]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as NonNullable<
      (typeof notesQuery.data)[number]
    >[];
  }, [notesQuery.data, selectedIds]);

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

  const longPress = useLongPress({
    onLongPress: () => {
      if (selectionMode) return;
      setSelectionMode(true);
    },
  });

  async function toggleFavorite(id: string) {
    const note = (notesQuery.data ?? []).find((n) => n.id === id);
    if (!note) return;
    await notesRepository.update({
      ...note,
      updatedAt: Date.now(),
      isFavorite: !note.isFavorite,
    });
    await queryClient.invalidateQueries({ queryKey: ["notes"] });
  }

  async function deleteNote(id: string) {
    const note = (notesQuery.data ?? []).find((n) => n.id === id);
    if (!note) return;
    await notesRepository.delete(note);
    await queryClient.invalidateQueries({ queryKey: ["notes"] });
    toast.success("Deleted");
  }

  return (
    <Screen>
      <AppHeader
        title={selectionMode ? `${selectedIds.length} selected` : "Notes"}
        right={
          selectionMode ? (
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => {
                setSelectionMode(false);
                setSelected({});
              }}
            >
              Done
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => navigate("/app/record")}
            >
              New
            </Button>
          )
        }
      />

      {selectionMode ? (
        <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-tight">Bulk actions</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Long-press a note to enter selection mode.
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {selectedIds.length}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="h-12 rounded-2xl justify-start gap-2"
              disabled={selectedIds.length === 0}
              onClick={async () => {
                if (selectedNotes.length === 0) return;
                const anyUnfav = selectedNotes.some((n) => !n.isFavorite);
                await Promise.all(
                  selectedNotes.map((n) =>
                    notesRepository.update({
                      ...n,
                      updatedAt: Date.now(),
                      isFavorite: anyUnfav ? true : false,
                    })
                  )
                );
                await queryClient.invalidateQueries({ queryKey: ["notes"] });
                toast.success(anyUnfav ? "Favorited" : "Unfavorited");
              }}
            >
              <Star className="h-4 w-4" />
              {selectedNotes.some((n) => !n.isFavorite)
                ? "Favorite"
                : "Unfavorite"}
            </Button>

            <Button
              variant="destructive"
              className="h-12 rounded-2xl justify-start gap-2"
              disabled={selectedIds.length === 0}
              onClick={async () => {
                if (selectedNotes.length === 0) return;
                const ok = window.confirm(
                  `Delete ${selectedNotes.length} note(s)? This cannot be undone.`
                );
                if (!ok) return;
                await Promise.all(selectedNotes.map((n) => notesRepository.delete(n)));
                await queryClient.invalidateQueries({ queryKey: ["notes"] });
                setSelected({});
                setSelectionMode(false);
                toast.success("Deleted");
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-5 space-y-6" {...longPress}>
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
                <div key={note.id}>
                  <SwipeableNoteRow
                    note={note}
                    selected={Boolean(selected[note.id])}
                    selectionMode={selectionMode}
                    onToggleSelected={() =>
                      setSelected((s) => ({ ...s, [note.id]: !s[note.id] }))
                    }
                    onClick={() => navigate(`/note/${note.id}`)}
                    onToggleFavorite={() => toggleFavorite(note.id)}
                    onDelete={() => deleteNote(note.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!selectionMode ? (
        <div className="mt-6 pb-28 text-xs text-muted-foreground">
          Tip: swipe right to favorite, swipe left to delete. Long-press for multi-select.
        </div>
      ) : (
        <div className="pb-28" />
      )}
    </Screen>
  );
}