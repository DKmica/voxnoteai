import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { Mic, NotebookText, Search, Sparkles } from "lucide-react";

const items = [
  {
    Icon: Mic,
    title: "Record",
    body: "Tap once. Auto-pause on silence."
  },
  {
    Icon: Sparkles,
    title: "Understand",
    body: "Structured summaries + actions."
  },
  {
    Icon: NotebookText,
    title: "Organize",
    body: "Tags + types, instantly editable."
  },
  {
    Icon: Search,
    title: "Search & Chat",
    body: "Semantic retrieval across notes."
  },
] as const;

export function FeatureHero({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[32px] border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {brand.tagline}
          </div>
          <div className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-tight">
            Voice notes that turn into
            <span className="text-primary"> decisions</span>.
          </div>
          <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A fast recorder with background transcription, summaries, Moment Cards, and grounded chat/search.
          </div>
        </div>

        <div className="hidden shrink-0 sm:block">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-border/60 bg-background">
        <img
          src="/hero-voxnote.svg"
          alt="VoxNote AI illustration"
          className="h-auto w-full"
          loading="eager"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {items.map(({ Icon, title, body }) => (
          <div
            key={title}
            className="rounded-3xl border border-border/60 bg-background/70 p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              {title}
            </div>
            <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {body}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
