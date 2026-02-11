import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export function WaveformBars({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  const bars = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const clamped = Math.max(0, Math.min(1, level));

  return (
    <div className={cn("flex items-end gap-1", className)} aria-hidden="true">
      {bars.map((i) => {
        const base = 0.18 + (i % 6) * 0.06;
        const h = Math.min(1, base + clamped * 1.4);
        return (
          <div
            key={i}
            className="w-1.5 rounded-full bg-primary/20"
            style={{ height: `${Math.round(h * 52)}px` }}
          />
        );
      })}
    </div>
  );
}
