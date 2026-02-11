import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function AppHeader({
  title,
  right,
  className,
}: {
  title?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="vox-chip text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="truncate">{brand.appName}</span>
        </div>
        {title ? (
          <h1 className="mt-2 text-[30px] font-semibold leading-[1.02] tracking-tight text-foreground">
            {title}
          </h1>
        ) : null}
      </div>
      {right ? <div className="shrink-0 pt-1">{right}</div> : null}
    </div>
  );
}