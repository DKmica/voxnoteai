import { useEffect } from "react";
import { jobQueue } from "@/background/jobQueue";
import { EntitlementsService } from "@/services/entitlements/EntitlementsService";

export function BackgroundJobsBootstrap() {
  useEffect(() => {
    // Initialize monthly counters early so UI can read them.
    EntitlementsService.ensureFresh().catch(() => undefined);

    jobQueue.start();
    return () => jobQueue.stop();
  }, []);

  return null;
}