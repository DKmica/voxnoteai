import { loadPreferences } from "@/state/preferences";
import { aiKeyring } from "@/services/ai/keyring";

export type AiRequestMeta = {
  purpose:
    | "transcription"
    | "summarization"
    | "embedding"
    | "chat_note"
    | "chat_global"
    | "moment_cards";
};

type RetryOptions = {
  retries: number;
  minDelayMs: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(ms: number) {
  return ms + Math.floor(Math.random() * Math.min(250, ms * 0.1));
}

class RateLimiter {
  private inFlight = 0;
  private lastStartAt = 0;
  constructor(private opts: { maxConcurrent: number; minSpacingMs: number }) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.inFlight >= this.opts.maxConcurrent) {
      await sleep(50);
    }
    const now = Date.now();
    const wait = Math.max(0, this.opts.minSpacingMs - (now - this.lastStartAt));
    if (wait) await sleep(wait);

    this.inFlight++;
    this.lastStartAt = Date.now();
    try {
      return await fn();
    } finally {
      this.inFlight--;
    }
  }
}

const limiter = new RateLimiter({ maxConcurrent: 2, minSpacingMs: 650 });

export const aiKeys = {
  /**
   * Legacy single-key API kept for backward compatibility.
   * The UI and providers should use the keyring instead.
   */
  getOpenAiKey(): string | null {
    try {
      return localStorage.getItem("voxnote.openai_api_key");
    } catch {
      return null;
    }
  },
  setOpenAiKey(key: string) {
    localStorage.setItem("voxnote.openai_api_key", key);
  },
  clearOpenAiKey() {
    localStorage.removeItem("voxnote.openai_api_key");
  },
};

export function getAiAuth(meta: AiRequestMeta): { apiKey: string; baseUrl: string } {
  const rec = aiKeyring.getKeyFor(meta);
  if (!rec) throw new Error("Missing AI API key. Add one in Profile.");
  return {
    apiKey: rec.apiKey,
    baseUrl: (rec.baseUrl ?? "https://api.openai.com").replace(/\/+$/, ""),
  };
}

export async function aiFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  meta: AiRequestMeta,
  retry: RetryOptions = { retries: 3, minDelayMs: 800 }
) {
  const prefs = loadPreferences();
  const headers = new Headers(init.headers ?? {});
  headers.set("X-VoxNote-Purpose", meta.purpose);
  headers.set("X-VoxNote-AI-Training-OptOut", prefs.aiTrainingOptOut ? "1" : "0");

  return limiter.run(async () => {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const res = await fetch(input, { ...init, headers });
        if (res.ok) return res;

        // Retry on 429/5xx
        if (
          attempt < retry.retries &&
          (res.status === 429 || (res.status >= 500 && res.status <= 599))
        ) {
          attempt++;
          await sleep(jitter(retry.minDelayMs * Math.pow(2, attempt - 1)));
          continue;
        }
        return res;
      } catch (e) {
        if (attempt >= retry.retries) throw e;
        attempt++;
        await sleep(jitter(retry.minDelayMs * Math.pow(2, attempt - 1)));
      }
    }
  });
}