"use client";

import { Search, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const hints = ["трудовой договор", "аренда квартиры", "расписка о займе", "доверенность на авто"];

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (value: string) => router.push(`/catalog${value.trim() ? `?q=${encodeURIComponent(value.trim())}` : ""}`);
  const askAI = () => {
    const el = document.getElementById("ai-chat-input") as HTMLTextAreaElement | null;
    document.getElementById("ai")?.scrollIntoView({ behavior: "smooth" });
    if (el && q.trim()) {
      el.value = q.trim();
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setTimeout(() => el?.focus(), 500);
  };
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="group flex items-center gap-2 rounded-full border border-line bg-surface p-2 pl-5 shadow-lift transition-shadow focus-within:border-ai focus-within:ring-4 focus-within:ring-ai/15"
      >
        <Search className="size-5 shrink-0 text-text-2" aria-hidden />
        <label htmlFor="hero-q" className="sr-only">Какой документ нужен?</label>
        <input
          id="hero-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Какой документ нужен?"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-text-2/80 sm:text-lg"
          autoComplete="off"
        />
        <button type="button" onClick={askAI} className="hidden h-11 items-center gap-2 rounded-full bg-ai-soft px-4 text-sm font-semibold text-ai transition-colors hover:brightness-95 sm:inline-flex">
          <Sparkles className="size-4" /> Спросить ИИ
        </button>
        <button type="submit" className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-hover" aria-label="Найти">
          <ArrowRight className="size-5" />
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2 pl-2 text-sm text-text-2">
        <span>Например:</span>
        {hints.map((h) => (
          <button key={h} onClick={() => go(h)} className="rounded-full border border-line bg-surface/60 px-3 py-1 transition-colors hover:border-text-2/40 hover:text-text">
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}
