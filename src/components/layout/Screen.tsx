import React from "react";
import { cn } from "@/lib/utils";

export function Screen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md px-4 pb-28 pt-5",
        "[text-wrap:pretty]",
        className
      )}
    >
      {/* Subtle entrance for top-level content */}
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-500">
        {children}
      </div>
    </div>
  );
}