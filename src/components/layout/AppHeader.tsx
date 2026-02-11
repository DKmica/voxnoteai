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
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div>
        <div className="text-sm font-semibold text-muted-foreground">{brand.appName}</div>
        {title ? (
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
