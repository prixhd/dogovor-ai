"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatThread, type ThreadItem } from "./ChatThread";
import { streamChat } from "@/lib/ai";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

type Props = { document?: unknown; examples?: string[]; className?: string; onQuota?: (q: { remaining: number; limit: number }) => void };

/** Light-themed chat used in the constructor and the cabinet. */
export function ChatPanel({ document, examples = [], className, onQuota }: Props) {
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setError("");
    setInput("");
    const history = [...items.filter((m) => !m.pending).map(({ role, content }) => ({ role, content })), { role: "user" as const, content: q }];
    setItems([...history, { role: "assistant", content: "", pending: true }]);
    setBusy(true);
    try {
      await streamChat({ messages: history.slice(-8), document }, {
        onDelta: (t) => setItems((xs) => xs.map((m, i) => (i === xs.length - 1 ? { ...m, content: m.content + t } : m))),
        onDone: (d) => {
          setItems((xs) => xs.map((m, i) => (i === xs.length - 1 ? { ...m, pending: false, citations: d.citations } : m)));
          onQuota?.({ remaining: d.remaining, limit: d.limit });
        },
      });
    } catch (e) {
      setItems((xs) => xs.slice(0, -1));
      setError(e instanceof Error ? e.message : "Ошибка");
      api<{ remaining: number; limit: number }>("/ai/quota").then((q) => onQuota?.(q)).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-text-2">Спросите про нормы или про этот документ. Ответы со ссылками на статьи из нашей базы.</p>
            {examples.map((e) => (
              <button key={e} onClick={() => send(e)} disabled={busy} className="self-start rounded-2xl border border-line px-3.5 py-2 text-left text-sm transition-colors hover:border-ai/50 hover:bg-ai-soft/40">{e}</button>
            ))}
          </div>
        ) : (
          <ChatThread items={items} />
        )}
      </div>
      {error && <p role="alert" className="mx-4 mb-2 rounded-xl bg-[#fde3df] px-3 py-2 text-sm text-[#b8392f] dark:bg-[#3a1f1d] dark:text-[#ff9d93]">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-line p-3">
        <label htmlFor="chat-panel-input" className="sr-only">Вопрос ИИ</label>
        <textarea
          id="chat-panel-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={1}
          maxLength={1000}
          placeholder="Ваш вопрос"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] outline-none focus:border-ai focus:ring-4 focus:ring-ai/15"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Отправить" className="grid size-11 shrink-0 place-items-center rounded-full bg-ai text-white transition hover:brightness-110 disabled:opacity-40">
          <ArrowUp className="size-5" />
        </button>
      </form>
    </div>
  );
}
