"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MessageSquare, ShieldAlert, ShieldCheck, Sparkles, Wand2, X, RotateCcw } from "lucide-react";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import type { Citation } from "@/lib/ai";
import { cn } from "@/lib/cn";
import { wordDiff } from "@/lib/diff";
import { applyOp, type EditOp } from "@/lib/edits";
import type { Data, Edits, RenderedBlock, RenderedDoc, Template } from "@/lib/template";

type Props = {
  template: Template;
  doc: RenderedDoc | null;
  data: Data;
  edits: Edits;
  setEdits: (e: Edits) => void;
  setData: (fn: (d: Data) => Data) => void;
  setHighlight: (h: Record<string, "add" | "change" | "remove">) => void;
  className?: string;
};

type Proposal = EditOp & { status: "pending" | "accepted" | "rejected" };

const quick = ["Добавь пункт о конфиденциальности", "Сделай договор в пользу моей стороны", "Смягчи ответственность", "Проверь, чего не хватает"];

function plain(b?: RenderedBlock) {
  if (!b) return "";
  return (b.segments ?? []).map((s) => s.t).join("");
}

/** Mode C: AI chat about norms + AI editor with accept/reject diff. */
export function AIPanel({ template: t, doc, data, edits, setEdits, setHighlight, className }: Props) {
  const [tab, setTab] = useState<"edit" | "chat">("edit");
  const [side, setSide] = useState<string>("neutral");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);

  useEffect(() => {
    api<{ remaining: number; limit: number }>("/ai/quota").then(setQuota).catch(() => {});
  }, []);

  const blocks = useMemo(() => new Map((doc?.blocks ?? []).map((b) => [b.id, b])), [doc]);
  const docContext = { templateSlug: t.slug, data, edits };

  useEffect(() => {
    const h: Record<string, "add" | "change" | "remove"> = {};
    for (const p of proposals) {
      if (p.status !== "pending") continue;
      if (p.op === "replace") h[p.id] = "change";
      if (p.op === "delete") h[p.id] = "remove";
      if (p.op === "insert" && p.after) h[p.after] = h[p.after] ?? "add";
    }
    setHighlight(h);
  }, [proposals, setHighlight]);
  useEffect(() => () => setHighlight({}), [setHighlight]);

  const run = async (text: string) => {
    const instr = text.trim();
    if (!instr || busy) return;
    setBusy(true);
    setError("");
    setSummary("");
    setProposals([]);
    try {
      const r = await api<{ summary: string; ops: EditOp[]; citations: Citation[]; remaining: number; limit: number }>("/ai/edit", {
        method: "POST",
        json: { ...docContext, instruction: instr, side },
      });
      setSummary(r.summary || (r.ops.length ? "" : "ИИ не нашёл, что изменить."));
      setCitations(r.citations ?? []);
      setProposals(r.ops.map((o) => ({ ...o, status: "pending" })));
      setQuota({ remaining: r.remaining, limit: r.limit });
      const first = r.ops[0];
      if (first) document.getElementById(`blk-${first.op === "insert" ? first.after : first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "ИИ сейчас недоступен");
      api<{ remaining: number; limit: number }>("/ai/quota").then(setQuota).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const decide = (idx: number, accept: boolean) => {
    const p = proposals[idx];
    if (accept) setEdits(applyOp(edits, p));
    setProposals((ps) => ps.map((x, i) => (i === idx ? { ...x, status: accept ? "accepted" : "rejected" } : x)));
  };
  const acceptAll = () => {
    let e = edits;
    for (const p of proposals) if (p.status === "pending") e = applyOp(e, p);
    setEdits(e);
    setProposals((ps) => ps.map((x) => (x.status === "pending" ? { ...x, status: "accepted" } : x)));
  };
  const pending = proposals.filter((p) => p.status === "pending").length;
  const hasEdits = !!(edits.inserted?.length || edits.deleted?.length || Object.keys(edits.replaced ?? {}).length);

  return (
    <aside aria-label="ИИ-помощник" className={cn("flex max-h-[calc(100dvh-150px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft lg:sticky lg:top-[140px]", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-ai text-white"><Sparkles className="size-4" /></span>
          <p className="font-semibold">ИИ-помощник</p>
        </div>
        {quota && <span className="rounded-full bg-ai-soft px-2.5 py-1 text-xs font-semibold text-ai" data-testid="ai-quota">Осталось {quota.remaining} из {quota.limit}</span>}
      </div>
      <div role="tablist" className="flex gap-1 border-b border-line p-1.5">
        {([["edit", "Доработать", Wand2], ["chat", "Спросить", MessageSquare]] as const).map(([k, l, Icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium", tab === k ? "bg-ai-soft text-ai" : "text-text-2 hover:text-text")}><Icon className="size-4" />{l}</button>
        ))}
      </div>

      {tab === "chat" ? (
        <ChatPanel className="min-h-[420px] flex-1" document={docContext} onQuota={setQuota} examples={["Что обязательно должно быть в этом договоре?", "Какой максимальный испытательный срок?", "Чем рискует работодатель?"]} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Чью сторону занять</legend>
            <div className="flex flex-wrap gap-1.5">
              {[{ id: "neutral", label: "Нейтрально" }, ...t.roles.map((r) => ({ id: r.id, label: `В пользу: ${r.label.toLowerCase()}` }))].map((o) => (
                <button key={o.id} type="button" aria-pressed={side === o.id} onClick={() => setSide(o.id)} className={cn("h-8 rounded-full border px-3 text-[13px] font-medium transition-colors", side === o.id ? "border-ai bg-ai text-white" : "border-line text-text-2 hover:text-text")}>{o.label}</button>
              ))}
            </div>
          </fieldset>
          <form onSubmit={(e) => { e.preventDefault(); run(instruction); }} className="flex flex-col gap-2">
            <label htmlFor="ai-instruction" className="text-sm font-medium">Что изменить?</label>
            <textarea id="ai-instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={500} rows={3} placeholder="Например: сделай в пользу работодателя" className="resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-ai focus:ring-4 focus:ring-ai/15" />
            <div className="flex flex-wrap gap-1.5">
              {quick.map((q) => (
                <button key={q} type="button" onClick={() => { setInstruction(q); run(q); }} disabled={busy} className="rounded-full bg-surface-2 px-3 py-1.5 text-xs text-text-2 transition-colors hover:text-text disabled:opacity-50">{q}</button>
              ))}
            </div>
            <Button type="submit" variant="ai" loading={busy} disabled={!instruction.trim()} className="mt-1"><Sparkles className="size-4" />Предложить правки</Button>
          </form>

          {error && <p role="alert" className="rounded-xl bg-[#fde3df] px-3 py-2 text-sm text-[#b8392f] dark:bg-[#3a1f1d] dark:text-[#ff9d93]">{error}</p>}
          {busy && <div className="flex flex-col gap-2" aria-hidden>{[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>}

          {(summary || proposals.length > 0) && (
            <section aria-label="Предложенные правки" className="flex flex-col gap-3">
              {summary && <p className="rounded-xl bg-ai-soft/60 px-3.5 py-2.5 text-sm">{summary}</p>}
              {proposals.map((p, i) => {
                const before = p.op !== "insert" ? plain(blocks.get(p.id)) : "";
                return (
                  <article key={i} className={cn("flex flex-col gap-2.5 rounded-xl border p-3.5 text-sm transition-opacity", p.status === "pending" ? "border-line" : "border-transparent bg-surface-2/50 opacity-70")}
                    onMouseEnter={() => document.getElementById(`blk-${p.op === "insert" ? p.after : p.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                    <div className="flex items-center justify-between">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", p.op === "insert" && "bg-[#dcf3e9] text-[#1d7a57]", p.op === "replace" && "bg-[#e8ecff] text-[#3048c9]", p.op === "delete" && "bg-[#fde3df] text-[#b8392f]")}>
                        {p.op === "insert" ? "Новый пункт" : p.op === "replace" ? "Изменение" : "Удаление"}
                      </span>
                      {p.status !== "pending" && <span className="text-xs text-text-2">{p.status === "accepted" ? "Принято" : "Отклонено"}</span>}
                    </div>
                    <p className="font-serif leading-relaxed">
                      {p.op === "replace"
                        ? wordDiff(before, p.text ?? "").map((d, j) => <span key={j} className={cn(d.type === "add" && "rounded bg-[#dcf3e9] text-[#14653f] dark:bg-[#15302a] dark:text-[#7fe0b6]", d.type === "del" && "rounded bg-[#fde3df] text-[#b8392f] line-through dark:bg-[#3a1f1d] dark:text-[#ff9d93]")}>{d.text}</span>)
                        : p.op === "delete"
                          ? <span className="rounded bg-[#fde3df] text-[#b8392f] line-through dark:bg-[#3a1f1d] dark:text-[#ff9d93]">{before}</span>
                          : <span className="rounded bg-[#dcf3e9] text-[#14653f] dark:bg-[#15302a] dark:text-[#7fe0b6]">{p.text}</span>}
                    </p>
                    {p.reason && <p className="text-xs leading-relaxed text-text-2">{p.reason}</p>}
                    {p.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => decide(i, true)} className="h-8 flex-1 border-success/40 text-success"><Check className="size-4" />Принять</Button>
                        <Button size="sm" variant="ghost" onClick={() => decide(i, false)} className="h-8 flex-1"><X className="size-4" />Отклонить</Button>
                      </div>
                    )}
                  </article>
                );
              })}
              {pending > 1 && <Button size="sm" variant="ai" onClick={acceptAll}><Check className="size-4" />Принять все ({pending})</Button>}
              {!!citations.length && (
                <div className="flex flex-wrap gap-1.5">
                  {citations.map((c) => (
                    <span key={c.ref} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", c.verified ? "bg-[#dcf3e9] text-[#1d7a57]" : "bg-[#fde3df] text-[#b8392f]")}>
                      {c.verified ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}{c.ref}{!c.verified && " · не подтверждено"}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}
          {hasEdits && (
            <button onClick={() => { if (confirm("Убрать все принятые правки ИИ и вернуть текст шаблона?")) setEdits({}); }} className="flex items-center gap-1.5 self-start text-xs text-text-2 hover:text-danger"><RotateCcw className="size-3.5" />Сбросить все правки ИИ</button>
          )}
          <p className="mt-auto text-xs leading-relaxed text-text-2">ИИ предлагает правки, вы решаете. Сервис не заменяет консультацию юриста.</p>
        </div>
      )}
    </aside>
  );
}
