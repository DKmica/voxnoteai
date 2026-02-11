import { aiFetch, aiKeys } from "@/services/ai/AiService";

export type ChatMode = "note" | "global";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatContextNote = {
  id: string;
  title: string;
  createdAt: number;
  summary?: string;
  transcript?: string;
};

function formatContext(notes: ChatContextNote[]) {
  return notes
    .map((n, i) => {
      const header = `NOTE ${i + 1} (id=${n.id}) — ${n.title} — ${new Date(
        n.createdAt
      ).toISOString()}`;
      const body = [
        n.summary ? `Summary: ${n.summary}` : null,
        n.transcript ? `Transcript: ${n.transcript}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return `${header}\n${body}`;
    })
    .join("\n\n---\n\n");
}

export async function chatWithNotes(params: {
  mode: ChatMode;
  notes: ChatContextNote[];
  messages: ChatMessage[];
}): Promise<string> {
  const key = aiKeys.getOpenAiKey();
  if (!key) throw new Error("Missing OpenAI API key. Add it in Profile.");

  const context = formatContext(params.notes);

  const system =
    "You are VoxNote AI. Answer ONLY using the provided notes. Never claim facts that are not in the notes. " +
    "If the answer isn't present, say you don't know and suggest what to record next. " +
    "Be concise and practical. When useful, reference note titles or ids.";

  const res = await aiFetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              params.mode === "note"
                ? "You are chatting about THIS ONE note."
                : "You are chatting across ALL notes.",
          },
          { role: "user", content: `NOTES CONTEXT:\n\n${context}` },
          ...params.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    },
    { purpose: params.mode === "note" ? "chat_note" : "chat_global" }
  );

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: unknown;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!res.ok || !content) {
    throw new Error(
      typeof json.error === "string"
        ? json.error
        : `Chat failed (HTTP ${res.status}).`
    );
  }

  return content.trim();
}
