import { Screen } from "@/components/layout/Screen";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { voxnoteDb } from "@/data/idb/voxnoteDb";
import { notesRepository } from "@/data/notesRepository";
import { momentCardsRepository } from "@/data/momentCardsRepository";
import { useNavigate } from "react-router-dom";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

function downloadFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <Screen>
      <AppHeader
        title="Privacy"
        right={
          <Button variant="ghost" className="rounded-2xl" onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-5 shadow-sm">
        <div className="text-sm font-semibold tracking-tight">Your data, your rules</div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          VoxNote AI stores notes locally in your browser (IndexedDB). Cloud AI calls are opt-in and require your own API key.
        </p>

        <div className="mt-5 grid gap-3">
          <Button
            variant="secondary"
            className="h-12 rounded-2xl justify-start gap-2"
            onClick={async () => {
              toast.message("Preparing export…");
              try {
                const notes = await notesRepository.list();
                const exportNotes = [] as any[];

                for (const n of notes) {
                  const audioBlob = await notesRepository.getAudioBlob(n);
                  const audioDataUrl = audioBlob ? await blobToDataUrl(audioBlob) : null;

                  const cards = await momentCardsRepository.listForNote(n.id);
                  const exportCards = [] as any[];
                  for (const c of cards) {
                    const img = await momentCardsRepository.getImageBlob(c);
                    exportCards.push({
                      ...c,
                      imageDataUrl: img ? await blobToDataUrl(img) : null,
                    });
                  }

                  exportNotes.push({
                    ...n,
                    audioDataUrl,
                    momentCards: exportCards,
                  });
                }

                const payload = {
                  schema: "voxnote.export.v1",
                  exportedAt: new Date().toISOString(),
                  notes: exportNotes,
                  featureFlags: (() => {
                    try {
                      return JSON.parse(localStorage.getItem("voxnote.flags.v1") ?? "{}") as unknown;
                    } catch {
                      return {};
                    }
                  })(),
                };

                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                  type: "application/json;charset=utf-8",
                });

                downloadFile(`voxnote-export-${Date.now()}.json`, blob);
                toast.success("Export downloaded");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Export failed.");
              }
            }}
          >
            <Download className="h-4 w-4" />
            Export data (JSON)
          </Button>

          <Button
            variant="destructive"
            className="h-12 rounded-2xl justify-start gap-2"
            onClick={async () => {
              const ok = window.confirm(
                "Delete all local VoxNote AI data from this browser? This cannot be undone."
              );
              if (!ok) return;

              try {
                await voxnoteDb.clearAll();
                // Clear localStorage keys used by the app.
                [
                  "voxnote.preferences.v1",
                  "voxnote.flags.v1",
                  "voxnote.openai_api_key",
                  "voxnote.jobs.v1",
                  "voxnote.jobs.lock.v1",
                ].forEach((k) => {
                  try {
                    localStorage.removeItem(k);
                  } catch {
                    // ignore
                  }
                });

                toast.success("Deleted");
                navigate("/start", { replace: true });
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Delete failed.");
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete all local data
          </Button>
        </div>

        <div className="mt-4 rounded-2xl bg-muted/50 p-4 text-xs text-muted-foreground">
          Privacy policy placeholder. Add your real policy before shipping.
        </div>
      </Card>
    </Screen>
  );
}
