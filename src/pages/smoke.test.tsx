import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AppStateProvider } from "@/state/AppStateProvider";
import RecordPage from "@/pages/Record";
import NotesPage from "@/pages/Notes";
import { voxnoteDb } from "@/data/idb/voxnoteDb";

function wrap(ui: React.ReactNode, initialPath: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={qc}>
      <AppStateProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/app/record" element={<RecordPage />} />
            <Route path="/app/notes" element={<NotesPage />} />
          </Routes>
          {ui}
        </MemoryRouter>
      </AppStateProvider>
    </QueryClientProvider>
  );
}

beforeEach(async () => {
  localStorage.clear();
  await voxnoteDb.clearAll();
});

describe("UI smoke", () => {
  it("renders Record screen", async () => {
    wrap(null, "/app/record");
    expect(await screen.findByText("Record")).toBeInTheDocument();
    expect(screen.getByLabelText("Start recording")).toBeInTheDocument();
  });

  it("renders Notes screen", async () => {
    wrap(null, "/app/notes");
    expect(await screen.findByText("Notes")).toBeInTheDocument();
  });
});
