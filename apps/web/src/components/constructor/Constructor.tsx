"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardList, Download, FileText, IdCard, RotateCcw, Save, Sparkles } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { evalCond, stepOfField, stepProgress, type Template } from "@/lib/template";
import { DocSheet } from "./DocSheet";
import { FieldInput } from "./FieldInput";
import { PartyPanel } from "./PartyPanel";
import { AIPanel } from "./AIPanel";
import { useDocument } from "./useDocument";

export type Mode = "form" | "cards" | "ai";

const modes: { id: Mode; label: string; short: string; icon: typeof ClipboardList }[] = [
  { id: "form", label: "Конструктор", short: "Анкета", icon: ClipboardList },
  { id: "cards", label: "По карточке", short: "Карточки", icon: IdCard },
  { id: "ai", label: "С ИИ", short: "ИИ", icon: Sparkles },
];

export function Constructor({ template: t, docId, initialMode = "form" }: { template: Template; docId: string | null; initialMode?: Mode }) {
  const d = useDocument(t, docId);
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [activeField, setActiveField] = useState<string>();
  const [mobileTab, setMobileTab] = useState<"form" | "doc">("form");
  const [authModal, setAuthModal] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "docx" | "pdf">("");
  const [highlight, setHighlight] = useState<Record<string, "add" | "change" | "remove">>({});

  const cur = t.steps[step];
  const fields = cur.fields.filter((f) => evalCond(f.showIf, d.data));
  const progress = useMemo(() => t.steps.map((s) => stepProgress(s, d.data)), [t, d.data]);
  const total = Math.round((progress.reduce((a, b) => a + b, 0) / t.steps.length) * 100);
  const nextPath = `/c/${t.slug}${d.savedId ? `?doc=${d.savedId}` : ""}`;

  const focusField = useCallback(
    (id: string) => {
      const i = stepOfField(t, id);
      if (i < 0) return;
      setMode((m) => (m === "ai" ? m : m));
      setStep(i);
      setMobileTab("form");
      setActiveField(id);
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(id)}"]`);
        el?.focus();
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 60);
    },
    [t],
  );

  const goNext = () => {
    const bad = fields.filter((f) => d.errors[f.id]);
    if (bad.length) {
      setTouched((x) => ({ ...x, ...Object.fromEntries(bad.map((f) => [f.id, true])) }));
      focusField(bad[0].id);
      return;
    }
    if (step < t.steps.length - 1) setStep(step + 1);
  };

  const requireAuth = () => {
    if (user) return true;
    setAuthModal(true);
    return false;
  };

  const save = async () => {
    if (!requireAuth()) return;
    setBusy("save");
    try {
      const id = await d.save();
      toast("Документ сохранён в кабинете", "success");
      if (!docId) router.replace(`/c/${t.slug}?doc=${id}`, { scroll: false });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Не удалось сохранить", "error");
    } finally {
      setBusy("");
    }
  };

  const download = async (format: "docx" | "pdf") => {
    if (!requireAuth()) return;
    const firstErr = Object.keys(d.errors)[0];
    if (firstErr) {
      setTouched(Object.fromEntries(Object.keys(d.errors).map((k) => [k, true])));
      toast("Заполните обязательные поля, отмеченные в анкете", "error");
      focusField(firstErr);
      return;
    }
    setBusy(format);
    try {
      const id = await d.save();
      if (!docId) router.replace(`/c/${t.slug}?doc=${id}`, { scroll: false });
      const blob = await api<Blob>(`/documents/${id}/export?format=${format}`);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `${d.title}.${format}` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`Файл .${format} скачан и сохранён в кабинете`, "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Не удалось скачать", "error");
    } finally {
      setBusy("");
    }
  };

  if (d.loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <AlertTriangle className="size-10 text-danger" />
        <h1 className="font-display text-2xl font-bold">Документ не открылся</h1>
        <p className="text-text-2">{d.loadError}</p>
        <LinkButton href={`/c/${t.slug}`}>Начать новый</LinkButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col">
      {/* Toolbar */}
      <div className="sticky top-16 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
            <Link href="/catalog" className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-2" aria-label="Назад в каталог"><ArrowLeft className="size-4" /></Link>
            <div className="min-w-0">
              <input
                aria-label="Название документа"
                value={d.title}
                onChange={(e) => d.setTitle(e.target.value.slice(0, 200))}
                className="w-full min-w-0 truncate rounded-md bg-transparent font-display text-base font-bold outline-none hover:bg-surface-2 focus:bg-surface-2 sm:text-lg"
              />
              <div className="flex items-center gap-2 text-xs text-text-2">
                <span>{t.title}</span>
                {t.status === "draft" && <Tag tone="amber" className="h-5 px-2 text-[10px]">не проверен юристом</Tag>}
                <span className="hidden sm:inline">· заполнено {total}%</span>
              </div>
            </div>
          </div>
          <div role="tablist" aria-label="Режим" className="order-3 flex w-full items-center gap-1 rounded-full border border-line bg-surface p-1 xl:order-none xl:w-auto">
            {modes.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors xl:flex-none",
                  mode === m.id ? (m.id === "ai" ? "bg-ai text-white" : "bg-text text-bg") : "text-text-2 hover:text-text",
                )}
              >
                <m.icon className="size-4 shrink-0" />
                <span className="whitespace-nowrap sm:hidden">{m.short}</span>
                <span className="hidden whitespace-nowrap sm:inline">{m.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 max-sm:w-full max-sm:[&>*:last-child]:flex-1">
            <Button variant="secondary" size="sm" onClick={save} loading={busy === "save"} aria-label="Сохранить"><Save className="size-4" /><span className="hidden lg:inline">Сохранить</span></Button>
            <DownloadMenu busy={busy} onDownload={download} />
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="flex border-b border-line bg-surface lg:hidden" role="tablist" aria-label="Вид">
        {([["form", "Анкета"], ["doc", "Документ"]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={mobileTab === k} onClick={() => setMobileTab(k)} className={cn("flex-1 border-b-2 py-3 text-sm font-medium", mobileTab === k ? "border-accent text-text" : "border-transparent text-text-2")}>{l}</button>
        ))}
      </div>

      <div className={cn("mx-auto grid w-full max-w-[1600px] flex-1 gap-6 px-4 py-6 sm:px-6", mode === "ai" ? "lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[380px_minmax(0,1fr)_420px]" : "lg:grid-cols-[440px_minmax(0,1fr)]")}>
        {/* Left: questionnaire */}
        <aside className={cn("flex flex-col gap-5", mobileTab !== "form" && "hidden lg:flex", mode === "ai" && "lg:hidden xl:flex")}>
          {mode === "cards" && <PartyPanel template={t} data={d.data} setData={d.setData} />}
          <nav aria-label="Шаги анкеты" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-2">
            {t.steps.map((s, i) => {
              const done = progress[i] === 1;
              return (
                <button key={s.id} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition-colors", i === step ? "bg-surface-2 font-semibold" : "text-text-2 hover:bg-surface-2/60 hover:text-text")}>
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold", done ? "bg-success text-white" : i === step ? "bg-accent text-accent-ink" : "bg-surface-2 text-text-2")}>
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className="flex-1">{s.title}</span>
                  {!done && progress[i] > 0 && <span className="text-xs text-text-2">{Math.round(progress[i] * 100)}%</span>}
                </button>
              );
            })}
          </nav>
          <section aria-labelledby="step-title" className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
            <header>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Шаг {step + 1} из {t.steps.length}</p>
              <h2 id="step-title" className="mt-1 font-display text-xl font-bold">{cur.title}</h2>
              {cur.hint && <p className="mt-1 text-sm text-text-2">{cur.hint}</p>}
            </header>
            {fields.map((f) => (
              <FieldInput
                key={f.id}
                field={f}
                value={d.data[f.id]}
                error={touched[f.id] ? d.errors[f.id] : undefined}
                onChange={(v) => d.setField(f.id, v)}
                onBlur={() => setTouched((x) => ({ ...x, [f.id]: true }))}
              />
            ))}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowLeft className="size-4" />Назад</Button>
              {step < t.steps.length - 1 ? (
                <Button size="sm" onClick={goNext}>Далее<ArrowRight className="size-4" /></Button>
              ) : (
                <Button size="sm" onClick={() => download("docx")} loading={busy === "docx"}><Download className="size-4" />Скачать .docx</Button>
              )}
            </div>
          </section>
          <button onClick={() => { if (confirm("Очистить все поля анкеты?")) d.reset(); }} className="flex items-center gap-2 self-start text-sm text-text-2 hover:text-danger"><RotateCcw className="size-3.5" />Очистить анкету</button>
        </aside>

        {/* Center: document */}
        <section aria-label="Документ" className={cn("flex min-w-0 flex-col gap-4", mobileTab !== "doc" && "hidden lg:flex")}>
          <div className="flex items-start gap-3 rounded-2xl border border-[#f3c66b]/60 bg-[#fbeccb]/50 px-4 py-3 text-[13px] leading-relaxed dark:bg-[#33280f]/40">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#8a5a00] dark:text-[#f3c66b]" />
            <p>Шаблон-черновик: составлен по тексту закона, но не проверен юристом. Сервис помогает составить документ и не заменяет консультацию.</p>
          </div>
          <div className="rounded-3xl bg-surface-2/60 p-3 sm:p-8">
            <DocSheet doc={d.doc} activeField={activeField} onFieldClick={focusField} highlight={highlight} />
          </div>
        </section>

        {/* Right: AI */}
        {mode === "ai" && (
          <AIPanel template={t} doc={d.doc} data={d.data} edits={d.edits} setEdits={d.setEdits} setData={d.setData} setHighlight={setHighlight} className={cn(mobileTab !== "doc" && "hidden lg:flex")} />
        )}
      </div>

      <Modal open={authModal} onClose={() => setAuthModal(false)} title="Войдите, чтобы продолжить">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#fde3df] text-accent"><FileText className="size-5" /></span>
            <p className="text-text-2">Скачивание и сохранение доступны после входа: документ останется в вашем кабинете. Анкета уже сохранена в браузере и никуда не пропадёт.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <LinkButton href={`/login?next=${encodeURIComponent(nextPath)}`} className="flex-1">Войти</LinkButton>
            <LinkButton href={`/register?next=${encodeURIComponent(nextPath)}`} variant="secondary" className="flex-1">Создать аккаунт</LinkButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DownloadMenu({ busy, onDownload }: { busy: string; onDownload: (f: "docx" | "pdf") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex">
      <Button size="sm" onClick={() => onDownload("docx")} className="flex-1 rounded-r-none pr-3" loading={busy === "docx"}><Download className="size-4" />Скачать .docx</Button>
      <Button size="sm" onClick={() => setOpen(!open)} aria-label="Другие форматы" aria-expanded={open} className="rounded-l-none border-l border-white/25 px-2.5"><ChevronDown className="size-4" /></Button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-48 animate-rise rounded-2xl border border-line bg-surface p-1.5 shadow-lift" onMouseLeave={() => setOpen(false)}>
          <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => { setOpen(false); onDownload("pdf"); }}>
            <FileText className="size-4" /> Скачать PDF {busy === "pdf" && "…"}
          </button>
        </div>
      )}
    </div>
  );
}
