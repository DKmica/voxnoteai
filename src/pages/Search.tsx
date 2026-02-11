import { AppHeader } from "@/components/layout/AppHeader";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Filter, Sparkles } from "lucide-react";

export default function SearchPage() {
  return (
    <Screen>
      <AppHeader title="Search" />

      <Card className="mt-5 rounded-3xl border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search across notes (semantic + keyword)"
            className="h-11 rounded-2xl"
          />
          <Button variant="secondary" className="h-11 rounded-2xl px-3">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Date
          </Badge>
          <Badge variant="secondary" className="rounded-full">Type</Badge>
          <Badge variant="secondary" className="rounded-full">Tags</Badge>
          <Badge variant="secondary" className="rounded-full">Favorites</Badge>
        </div>

        <div className="mt-4 rounded-2xl bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Tip: Ask a question in Chat → we’ll pull the best matching notes.
          </div>
        </div>
      </Card>

      <div className="mt-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-3xl border-border/60 bg-card/80 p-4 shadow-sm">
            <div className="text-sm font-semibold tracking-tight">Result title</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Matched snippet preview…
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full">Idea</Badge>
              <Badge variant="secondary" className="rounded-full">Score 0.78</Badge>
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  );
}
