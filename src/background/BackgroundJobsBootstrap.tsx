import { useEffect } from "react";
import { jobQueue } from "@/background/jobQueue";

export function BackgroundJobsBootstrap() {
  useEffect(() => {
    jobQueue.start();
    return () => jobQueue.stop();
  }, []);

  return null;
}
