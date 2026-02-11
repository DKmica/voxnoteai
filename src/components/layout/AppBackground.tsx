import { cn } from "@/lib/utils";

const DOTS_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2399A3B3' fill-opacity='0.22'%3E%3Ccircle cx='2' cy='2' r='1.4'/%3E%3Ccircle cx='22' cy='22' r='1.4'/%3E%3Ccircle cx='42' cy='42' r='1.4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

export function AppBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      {/* Soft blobs (no gradients) */}
      <div className="absolute -top-28 -left-28 h-72 w-72 rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute -top-20 -right-24 h-80 w-80 rounded-full bg-accent/12 blur-3xl" />
      <div className="absolute -bottom-36 left-1/3 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      {/* Dot texture */}
      <div
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: DOTS_SVG, backgroundSize: "44px 44px" }}
      />

      {/* Vignette */}
      <div className="absolute inset-x-0 top-0 h-40 bg-background/70" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-background/70" />
    </div>
  );
}
