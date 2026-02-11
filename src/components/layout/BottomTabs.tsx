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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-2">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium tracking-tight">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
