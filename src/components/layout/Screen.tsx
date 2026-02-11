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
    <div className={cn("mx-auto w-full max-w-md px-4 pb-24 pt-4", className)}>
      {children}
    </div>
  );
}
