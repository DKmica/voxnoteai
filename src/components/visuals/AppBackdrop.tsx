import { cn } from "@/lib/utils";

export function AppBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
      aria-hidden
    >
      {/* Soft color blooms (solid, no gradients) */}
      <div className="absolute -top-20 -left-24 h-[360px] w-[360px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-28 -right-20 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute top-1/3 -right-28 h-[260px] w-[260px] rounded-full bg-primary/6 blur-3xl" />

      {/* Pattern texture */}
      <div className="absolute inset-0 opacity-70 [background-image:url('/pattern.svg')] [background-size:240px_240px]" />

      {/* Subtle vignette via opacity (no gradient) */}
      <div className="absolute inset-0 bg-background/40" />
    </div>
  );
}
