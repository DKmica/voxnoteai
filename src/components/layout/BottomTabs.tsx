import { cn } from "@/lib/utils";
import { Mic, NotebookText, Search, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { strings } from "@/config/strings";

const tabs = [
  { to: "/app/record", label: strings.tabs.record, Icon: Mic },
  { to: "/app/notes", label: strings.tabs.notes, Icon: NotebookText },
  { to: "/app/search", label: strings.tabs.search, Icon: Search },
  { to: "/app/profile", label: strings.tabs.profile, Icon: User },
] as const;

export function BottomTabs() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50">
      <div className="pointer-events-none mx-auto w-full max-w-md px-4 pb-4">
        <div className="pointer-events-auto rounded-[28px] border border-border/60 bg-background/80 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "group relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] transition",
                    "outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    isActive
                      ? "active bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5 transition-transform duration-200 group-active:scale-95" />
                <span className="font-semibold tracking-tight">{label}</span>
                <span className="absolute top-1.5 h-1.5 w-1.5 rounded-full bg-accent opacity-0 transition-opacity group-[.active]:opacity-100" />
              </NavLink>

            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}