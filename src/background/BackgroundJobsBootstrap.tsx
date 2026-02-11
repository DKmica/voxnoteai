import { useEffect } from "react";
import { jobQueue } from "@/background/jobQueue";
import { EntitlementsService } from "@/services/entitlements/EntitlementsService";
import { seedDemoDataIfEmpty } from "@/background/seedDemoData";

export function BackgroundJobsBootstrap() {
  useEffect(() => {
    // Initialize monthly counters early so UI can read them.
    EntitlementsService.ensureFresh().catch(() => undefined);

    // First-run demo content.
    seedDemoDataIfEmpty().catch(() => undefined);

    jobQueue.start();
    return () => jobQueue.stop();
  }, []);

  return null;
}