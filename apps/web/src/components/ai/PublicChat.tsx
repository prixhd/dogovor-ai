"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatThread, type ThreadItem } from "./ChatThread";
import { streamChat } from "@/lib/ai";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

const examples = ["Какой максимальный испытательный срок?", "Нужно ли заверять доверенность у нотариуса?", "Можно ли не указывать срок в договоре займа?"];

/** Public AI chat on the landing page with a visible daily quota counter. */
export function PublicChat() {
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ remaining: number; limit: number }>("/ai/quota").then(setQuota).catch(() => {});
  }, []);
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
      await streamChat({ messages: history.slice(-6) }, {
        onDelta: (t) => setItems((xs) => xs.map((m, i) => (i === xs.length - 1 ? { ...m, content: m.content + t } : m))),
        onDone: (d) => {
          setItems((xs) => xs.map((m, i) => (i === xs.length - 1 ? { ...m, pending: false, citations: d.citations } : m)));
          setQuota({ remaining: d.remaining, limit: d.limit });
        },
      });
    } catch (e) {
      setItems((xs) => xs.slice(0, -1));
      setError(e instanceof Error ? e.message : "Ошибка");
      api<{ remaining: number; limit: number }>("/ai/quota").then(setQuota).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const out = quota?.remaining === 0;
  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#16181d] shadow-[0_30px_80px_rgba(79,107,255,.18)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-[#4f6bff]"><Sparkles className="size-4 text-white" /></span>
          <div>
            <p className="text-sm font-semibold">Юридический ИИ-помощник</p>
            <p className="text-xs text-white/50">ТК РФ · ГК РФ</p>
          </div>
        </div>
        {quota && (
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", out ? "bg-[#3a1f1d] text-[#ff9d93]" : "bg-white/10 text-white/80")} data-testid="ai-quota">
            Осталось {quota.remaining} из {quota.limit} бесплатных вопросов
          </span>
        )}
      </div>
      <div ref={scroller} className="flex-1 overflow-y-auto px-5 py-5">
        {items.length === 0 ? (
          <div className="flex h-full flex-col justify-end gap-2">
            <p className="mb-2 text-sm text-white/50">Попробуйте спросить:</p>
            {examples.map((e) => (
              <button key={e} onClick={() => send(e)} disabled={busy || out} className="self-start rounded-2xl border border-white/10 px-4 py-2.5 text-left text-[15px] text-white/85 transition-colors hover:border-[#8fa2ff]/60 hover:bg-white/5 disabled:opacity-50">
                {e}
              </button>
            ))}
          </div>
        ) : (
          <ChatThread items={items} dark />
        )}
      </div>
      {error && <p role="alert" className="mx-5 mb-2 rounded-xl bg-[#3a1f1d] px-3 py-2 text-sm text-[#ff9d93]">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-white/10 p-3"
      >
        <label htmlFor="ai-chat-input" className="sr-only">Вопрос ИИ-помощнику</label>
        <textarea
          id="ai-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          maxLength={1000}
          disabled={out}
          placeholder={out ? "Лимит на сегодня исчерпан. Войдите, чтобы получить больше вопросов" : "Задайте вопрос по ТК или ГК РФ"}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-white/5 px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#8fa2ff]/50"
        />
        <button type="submit" disabled={busy || !input.trim() || out} aria-label="Отправить" className="grid size-11 shrink-0 place-items-center rounded-full bg-[#4f6bff] text-white transition hover:brightness-110 disabled:opacity-40">
          <ArrowUp className="size-5" />
        </button>
      </form>
    </div>
  );
}
