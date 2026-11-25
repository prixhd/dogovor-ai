"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, IdCard, Plus } from "lucide-react";
import { PartyForm } from "@/components/parties/PartyForm";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { kindLabels, partyValue, type Party, type PartyKind } from "@/lib/parties";
import type { Data, Role, Template } from "@/lib/template";
import { ExtractBox } from "./ExtractBox";

type Props = { template: Template; data: Data; setData: (fn: (d: Data) => Data) => void };

/** Applies a card to every field bound to the role. Returns filled count. */
export function applyParty(t: Template, role: Role, p: Party, setData: Props["setData"]): number {
  const updates: Data = {};
  for (const s of t.steps) for (const f of s.fields) {
    if (f.role !== role.id || !f.bind) continue;
    const v = partyValue(p, f.bind);
    if (v) updates[f.id] = v;
  }
  setData((d) => ({ ...d, ...updates }));
  return Object.keys(updates).length;
}

/** Mode B: pick a saved card for each contract role. */
export function PartyPanel({ template: t, data, setData }: Props) {
  const { user, loading } = useAuth();
  const toast = useToast();
  const [parties, setParties] = useState<Party[] | null>(null);
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState<Role | null>(null);

  const load = useCallback(async () => {
    try {
      setParties((await api<{ parties: Party[] }>("/parties")).parties);
    } catch {
      setParties([]);
    }
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const apply = (role: Role, p: Party) => {
    const n = applyParty(t, role, p, setData);
    setApplied((a) => ({ ...a, [role.id]: p.id }));
    toast(`«${p.title}» → ${role.label}: заполнено полей ${n}`, "success");
  };

  // Current role values, used to prefill a new card from what is typed.
  const prefillFor = (role: Role) => {
    const out: Record<string, string> = {};
    for (const s of t.steps) for (const f of s.fields) if (f.role === role.id && f.bind && data[f.id]) out[f.bind] = String(data[f.id]);
    return out;
  };

  return (
    <section aria-labelledby="cards-title" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <header className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#dcf3e9] text-[#1d7a57] dark:bg-[#15302a] dark:text-[#7fe0b6]"><IdCard className="size-5" /></span>
        <div>
          <h2 id="cards-title" className="font-display text-lg font-bold">Заполнить по карточке</h2>
          <p className="text-sm text-text-2">Выберите сохранённые реквизиты для каждой стороны</p>
        </div>
      </header>
      {loading ? (
        <Skeleton className="h-24" />
      ) : !user ? (
        <div className="rounded-xl bg-surface-2/70 p-4 text-sm">
          Карточки хранятся в кабинете. <Link href={`/login?next=/c/${t.slug}?mode=cards`} className="font-medium text-accent hover:underline">Войдите</Link>, чтобы подставлять реквизиты в один клик.
        </div>
      ) : (
        t.roles.map((role) => {
          const fit = (parties ?? []).filter((p) => role.kinds.includes(p.kind));
          return (
            <div key={role.id} className="flex flex-col gap-2">
              <p className="text-sm font-semibold">{role.label} <span className="font-normal text-text-2">· {role.kinds.map((k) => kindLabels[k as PartyKind]).join(", ")}</span></p>
              {parties === null ? (
                <Skeleton className="h-11" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {fit.map((p) => (
                    <button key={p.id} onClick={() => apply(role, p)} className={cn("flex h-10 max-w-full items-center gap-2 rounded-full border px-4 text-sm transition-colors", applied[role.id] === p.id ? "border-success bg-[#dcf3e9] text-[#1d7a57] dark:bg-[#15302a] dark:text-[#7fe0b6]" : "border-line hover:border-text-2/40")}>
                      {applied[role.id] === p.id && <Check className="size-4" />}
                      <span className="truncate">{p.title}</span>
                    </button>
                  ))}
                  <button onClick={() => setCreating(role)} className="flex h-10 items-center gap-1.5 rounded-full border border-dashed border-line px-4 text-sm text-text-2 hover:border-text-2/40 hover:text-text">
                    <Plus className="size-4" />{fit.length ? "Новая" : "Создать карточку"}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
      <ExtractBox template={t} setData={setData} />
      <Modal open={!!creating} onClose={() => setCreating(null)} title={`Карточка: ${creating?.label ?? ""}`} className="w-[min(720px,calc(100vw-32px))]">
        {creating && (
          <PartyForm
            allowedKinds={creating.kinds as PartyKind[]}
            prefill={prefillFor(creating)}
            onCancel={() => setCreating(null)}
            onSaved={(p) => {
              const role = creating;
              setCreating(null);
              setParties((xs) => [p, ...(xs ?? [])]);
              apply(role, p);
            }}
          />
        )}
      </Modal>
    </section>
  );
}
