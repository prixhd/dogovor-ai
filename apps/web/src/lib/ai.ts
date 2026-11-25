import { ApiError } from "./api";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Citation = { ref: string; title: string; verified: boolean };
export type ChatDone = { citations: Citation[]; remaining: number; limit: number };

type StreamHandlers = { onDelta: (text: string) => void; onDone: (d: ChatDone) => void };

function csrf(): string {
  const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

/** Streams an AI chat answer over SSE (fetch + ReadableStream, POST body). */
export async function streamChat(body: unknown, h: StreamHandlers, signal?: AbortSignal): Promise<void> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let msg = "ИИ сейчас недоступен. Конструктор продолжает работать.";
    let code = "ai_error";
    try {
      const j = await res.json();
      msg = j.message ?? msg;
      code = j.error ?? code;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, code, msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const ev = JSON.parse(line.slice(6));
      if (ev.type === "delta") h.onDelta(ev.text);
      else if (ev.type === "done") h.onDone(ev);
      else if (ev.type === "error") throw new ApiError(500, "ai_error", ev.message);
    }
  }
}
