"use client";

import { useState } from "react";
import { ChevronDown, ClipboardPaste, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Data, Template } from "@/lib/template";

type Result = { fields: Record<string, string>; warnings: Record<string, string> };

/** Paste requisites as text; AI splits them into fields; user confirms. */
export function ExtractBox({ template: t, setData }: { template: Template; setData: (fn: (d: Data) => Data) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(t.roles[0]?.id ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const labelOf = (id: string) => t.steps.flatMap((s) => s.fields).find((f) => f.id === id)?.label ?? id;

  const run = async () => {
    setBusy(true);
    setError("");
    setRes(null);
    try {
      const r = await api<Result>("/ai/extract", { method: "POST", json: { templateSlug: t.slug, role, text } });
      setRes(r);
      setPicked(Object.fromEntries(Object.keys(r.fields).map((k) => [k, !r.warnings[k]])));
      if (!Object.keys(r.fields).length) setError("Не нашли реквизитов в тексте. Проверьте, что вставлен текст карточки компании.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };
  const apply = () => {
    if (!res) return;
    const updates = Object.fromEntries(Object.entries(res.fields).filter(([k]) => picked[k]));
    setData((d) => ({ ...d, ...updates }));
    toast(`Подставлено полей: ${Object.keys(updates).length}`, "success");
    setRes(null);
    setText("");
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-dashed border-line">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium">
        <ClipboardPaste className="size-4 text-ai" />
        Вставить реквизиты текстом
        <span className="rounded-full bg-ai-soft px-2 py-0.5 text-[11px] font-semibold text-ai">ИИ</span>
        <ChevronDown className={cn("ml-auto size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Для какой стороны">
            {t.roles.map((r) => (
              <button key={r.id} type="button" role="radio" aria-checked={role === r.id} onClick={() => setRole(r.id)} className={cn("h-8 rounded-full border px-3 text-[13px]", role === r.id ? "border-text bg-text text-bg" : "border-line text-text-2")}>{r.label}</button>
            ))}
          </div>
          <label htmlFor="extract-text" className="sr-only">Текст с реквизитами</label>
          <textarea id="extract-text" value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={4000} placeholder={"ООО «Ромашка», ИНН 7707083893, ОГРН 1027700132195\nАдрес: г. Москва, ул. Вавилова, д. 19\nГенеральный директор Иванов Иван Иванович"} className="resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-ai focus:ring-4 focus:ring-ai/15" />
          <p className="text-xs text-text-2">Паспортные данные и телефоны скрываются перед отправкой в ИИ.</p>
          <Button size="sm" variant="ai" onClick={run} loading={busy} disabled={text.trim().length < 10}><Sparkles className="size-4" />Разобрать</Button>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {res && Object.keys(res.fields).length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-surface-2/60 p-3">
              <p className="text-sm font-medium">Проверьте, что подставить:</p>
              {Object.entries(res.fields).map(([id, v]) => (
                <label key={id} className="flex items-start gap-2.5 text-sm">
                  <Checkbox checked={!!picked[id]} onChange={(e) => setPicked((p) => ({ ...p, [id]: e.target.checked }))} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="text-text-2">{labelOf(id)}: </span>
                    <span className="font-medium">{v}</span>
                    {res.warnings[id] && <span className="block text-xs text-danger">{res.warnings[id]}</span>}
                  </span>
                </label>
              ))}
              <Button size="sm" onClick={apply} className="mt-1">Подставить выбранное</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
