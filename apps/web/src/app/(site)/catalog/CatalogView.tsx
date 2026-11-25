"use client";

import { LayoutGrid, List, Search, SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TemplateCard } from "@/components/catalog/TemplateCard";
import { categories, type TemplateSummary } from "@/lib/catalog";
import { cn } from "@/lib/cn";

type T = TemplateSummary & { keywords?: string[] };

function matches(t: T, q: string) {
  if (!q) return true;
  const hay = [t.title, t.description, ...(t.keywords ?? [])].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w.slice(0, Math.max(4, w.length - 2))));
}

export function CatalogView({ templates }: { templates: T[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState(params.get("cat") ?? "");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    try {
      const v = localStorage.getItem("catalog-view");
      if (v === "list" || v === "grid") setView(v);
    } catch {
      /* storage blocked */
    }
  }, []);
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (cat) sp.set("cat", cat);
    router.replace(`/catalog${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }, [q, cat, router]);

  const setViewSaved = (v: "grid" | "list") => {
    setView(v);
    try {
      localStorage.setItem("catalog-view", v);
    } catch {
      /* ignore */
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of templates) c[t.category] = (c[t.category] ?? 0) + 1;
    return c;
  }, [templates]);
  const list = templates.filter((t) => (!cat || t.category === cat) && matches(t, q));

  return (
    <div className="mt-10 flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex h-12 flex-1 items-center gap-3 rounded-full border border-line bg-surface px-5 shadow-soft focus-within:border-ai focus-within:ring-4 focus-within:ring-ai/15">
          <Search className="size-5 text-text-2" aria-hidden />
          <label htmlFor="catalog-q" className="sr-only">Поиск документа</label>
          <input id="catalog-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: аренда, займ, работник…" className="h-full flex-1 bg-transparent outline-none placeholder:text-text-2/80" />
        </div>
        <div className="flex items-center gap-1 self-start rounded-full border border-line bg-surface p-1" role="group" aria-label="Вид каталога">
          {([["grid", LayoutGrid, "Сетка"], ["list", List, "Список"]] as const).map(([v, Icon, label]) => (
            <button key={v} onClick={() => setViewSaved(v)} aria-pressed={view === v} className={cn("flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors", view === v ? "bg-surface-2 text-text" : "text-text-2 hover:text-text")}>
              <Icon className="size-4" />{label}
            </button>
          ))}
        </div>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Категории">
        <Chip active={!cat} onClick={() => setCat("")} label="Все" count={templates.length} />
        {Object.entries(categories).filter(([k]) => counts[k]).map(([k, c]) => (
          <Chip key={k} active={cat === k} onClick={() => setCat(cat === k ? "" : k)} label={c.label} count={counts[k]} />
        ))}
      </div>
      <p className="text-sm text-text-2" aria-live="polite">Найдено: <b className="text-text">{list.length}</b></p>
      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line bg-surface px-6 py-20 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2"><SearchX className="size-6 text-text-2" /></span>
          <h2 className="font-display text-xl font-bold">Ничего не нашли</h2>
          <p className="max-w-md text-text-2">Попробуйте другое слово или задайте вопрос ИИ-помощнику на главной: он подскажет, какой документ нужен.</p>
          <button onClick={() => { setQ(""); setCat(""); }} className="font-medium text-accent hover:underline">Сбросить фильтры</button>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((t) => <TemplateCard key={t.slug} t={t} />)}</div>
      ) : (
        <div className="flex flex-col gap-3">{list.map((t) => <TemplateCard key={t.slug} t={t} layout="list" />)}</div>
      )}
    </div>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn("flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors", active ? "border-text bg-text text-bg" : "border-line bg-surface text-text-2 hover:text-text")}>
      {label}
      <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-bg/20" : "bg-surface-2")}>{count}</span>
    </button>
  );
}
