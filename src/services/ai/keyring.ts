import type { AiRequestMeta } from "@/services/ai/AiService";

export type AiKeyRecord = {
  id: string;
  label: string;
  provider: "openai";
  apiKey: string;
  baseUrl?: string; // e.g. https://api.openai.com
  createdAt: number;
};

type Defaults = Partial<Record<AiRequestMeta["purpose"], string>> & {
  all?: string;
};

const KEYS_KEY = "voxnote.ai.keys.v1";
const DEFAULTS_KEY = "voxnote.ai.defaults.v1";
const LEGACY_OPENAI_KEY = "voxnote.openai_api_key";

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeBaseUrl(url?: string) {
  const u = (url ?? "").trim();
  if (!u) return undefined;
  return u.replace(/\/+$/, "");
}

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function loadKeys(): AiKeyRecord[] {
  const parsed = safeJsonParse<AiKeyRecord[]>(localStorage.getItem(KEYS_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

function saveKeys(keys: AiKeyRecord[]) {
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
}

function loadDefaults(): Defaults {
  return safeJsonParse<Defaults>(localStorage.getItem(DEFAULTS_KEY)) ?? {};
}

function saveDefaults(d: Defaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
}

function migrateLegacyKeyIfNeeded() {
  const keys = loadKeys();
  if (keys.length > 0) return;

  const legacy = (localStorage.getItem(LEGACY_OPENAI_KEY) ?? "").trim();
  if (!legacy) return;

  const k: AiKeyRecord = {
    id: uuid(),
    label: "Default OpenAI key",
    provider: "openai",
    apiKey: legacy,
    baseUrl: "https://api.openai.com",
    createdAt: Date.now(),
  };

  saveKeys([k]);
  saveDefaults({ all: k.id });
}

export const aiKeyring = {
  list(): AiKeyRecord[] {
    migrateLegacyKeyIfNeeded();
    return loadKeys().sort((a, b) => b.createdAt - a.createdAt);
  },

  getDefaults(): Defaults {
    migrateLegacyKeyIfNeeded();
    return loadDefaults();
  },

  setDefaultAll(keyId: string | undefined) {
    const d = this.getDefaults();
    const next = { ...d };
    if (!keyId) delete next.all;
    else next.all = keyId;
    saveDefaults(next);
  },

  setDefaultForPurpose(purpose: AiRequestMeta["purpose"], keyId: string | undefined) {
    const d = this.getDefaults();
    const next = { ...d };
    if (!keyId) delete next[purpose];
    else next[purpose] = keyId;
    saveDefaults(next);
  },

  add(params: { label: string; apiKey: string; baseUrl?: string }) {
    const keys = this.list();
    const rec: AiKeyRecord = {
      id: uuid(),
      label: params.label.trim() || "Untitled key",
      provider: "openai",
      apiKey: params.apiKey.trim(),
      baseUrl: normalizeBaseUrl(params.baseUrl) ?? "https://api.openai.com",
      createdAt: Date.now(),
    };
    const next = [rec, ...keys];
    saveKeys(next);

    // If this is the first key, set as global default.
    const defaults = this.getDefaults();
    if (!defaults.all) {
      saveDefaults({ ...defaults, all: rec.id });
    }

    return rec;
  },

  remove(id: string) {
    const keys = this.list().filter((k) => k.id !== id);
    saveKeys(keys);

    const defaults = this.getDefaults();
    const next: Defaults = { ...defaults };
    for (const k of Object.keys(next) as (keyof Defaults)[]) {
      if (next[k] === id) delete next[k];
    }
    saveDefaults(next);
  },

  clearAll() {
    localStorage.removeItem(KEYS_KEY);
    localStorage.removeItem(DEFAULTS_KEY);
  },

  getKeyFor(meta: AiRequestMeta): AiKeyRecord | null {
    migrateLegacyKeyIfNeeded();

    const keys = loadKeys();
    if (keys.length === 0) return null;

    const defaults = loadDefaults();
    const id = defaults[meta.purpose] ?? defaults.all;
    if (id) {
      const found = keys.find((k) => k.id === id);
      if (found) return found;
    }

    return keys[0] ?? null;
  },
};
