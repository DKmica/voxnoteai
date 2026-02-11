import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Note } from "@/domain/models";
import { formatDuration } from "@/utils/format";

export function SwipeableNoteRow({
  note,
  selected,
  selectionMode,
  onClick,
  onToggleSelected,
  onToggleFavorite,
  onDelete,
}: {
  note: Note;
  selected: boolean;
  selectionMode: boolean;
  onClick: () => void;
  onToggleSelected: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const action = useMemo(() => {
    if (dx > 64) return "favorite" as const;
    if (dx < -64) return "delete" as const;
    return null;
  }, [dx]);

  useEffect(() => {
    if (selectionMode) {
      // Don’t keep swipe state while selecting.
      setDx(0);
      setDragging(false);
      startRef.current = null;
      lastRef.current = null;
    }
  }, [selectionMode]);

  function onPointerDown(e: React.PointerEvent) {
    if (selectionMode) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    lastRef.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !startRef.current) return;
    lastRef.current = { x: e.clientX, y: e.clientY };

    const raw = e.clientX - startRef.current.x;
    // If user is scrolling vertically, avoid hijacking.
    const vy = Math.abs(e.clientY - startRef.current.y);
    const vx = Math.abs(raw);
    if (vy > 16 && vy > vx) return;

    const clamped = Math.max(-96, Math.min(96, raw));
    setDx(clamped);
  }

  async function finishGesture() {
    const a = action;
    setDragging(false);
    startRef.current = null;
    lastRef.current = null;
    setDx(0);

    if (a === "favorite") onToggleFavorite();
    if (a === "delete") onDelete();
  }

  function onPointerUp() {
    if (!dragging) return;
    finishGesture();
  }

  return (
    <div className="relative">
      {/* Background actions */}
      <div className="absolute inset-0 flex items-stretch justify-between overflow-hidden rounded-3xl">
        <div
          className={cn(
            "flex w-24 items-center justify-center rounded-3xl",
            note.isFavorite ? "bg-muted/50" : "bg-primary/12"
          )}
        >
          <Star
            className={cn(
              "h-5 w-5",
              note.isFavorite ? "fill-primary text-primary" : "text-primary"
            )}
          />
        </div>
        <div className="flex w-24 items-center justify-center rounded-3xl bg-destructive/12">
          <Trash2 className="h-5 w-5 text-destructive" />
        </div>
      </div>

      <div
        className={cn(
          "relative transition",
          dragging ? "transition-none" : "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (selectionMode) return onToggleSelected();
          if (Math.abs(dx) > 6) return; // ignore accidental click after swipe
          onClick();
        }}
        role="button"
        tabIndex={0}
      >
        <Card
          className={cn(
            "rounded-3xl border-border/60 bg-card/80 p-4 shadow-sm transition hover:bg-card",
            selectionMode && selected
              ? "ring-2 ring-primary/35"
              : "ring-0"
          )}
        >
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

            {selectionMode ? (
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-2xl border",
                  selected
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/70 bg-background text-muted-foreground"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSelected();
                }}
              >
                <span className="text-xs font-bold">{selected ? "✓" : ""}</span>
              </div>
            ) : (
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-2xl",
                  note.isFavorite
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 text-muted-foreground"
                )}
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    note.isFavorite ? "fill-primary text-primary" : ""
                  )}
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
