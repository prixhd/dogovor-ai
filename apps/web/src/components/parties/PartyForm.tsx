"use client";

import { Building2, Store, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { kindLabels, partySchema, type Party, type PartyKind } from "@/lib/parties";

const kindIcons = { org: Building2, ip: Store, person: User };
const digitTypes = new Set(["inn", "ogrn", "bik", "account"]);
const maxLen: Record<string, number> = { inn: 12, ogrn: 15, bik: 9, account: 20 };

type Props = { initial?: Party | null; allowedKinds?: PartyKind[]; prefill?: Record<string, string>; onSaved: (p: Party) => void; onCancel: () => void };

export function PartyForm({ initial, allowedKinds, prefill, onSaved, onCancel }: Props) {
  const kinds = allowedKinds ?? (["org", "ip", "person"] as PartyKind[]);
  const [kind, setKind] = useState<PartyKind>(initial?.kind ?? kinds[0]);
  const [data, setData] = useState<Record<string, string>>(initial?.data ?? prefill ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      const body = { kind, title: "", data };
      const r = initial
        ? await api<{ party: Party }>(`/parties/${initial.id}`, { method: "PUT", json: body })
        : await api<{ party: Party }>("/parties", { method: "POST", json: body });
      onSaved(r.party);
    } catch (err) {
      if (err instanceof ApiError) {
        setMessage(err.message);
        setErrors(err.fields ?? {});
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {kinds.length > 1 && (
        <div role="radiogroup" aria-label="Тип стороны" className="grid grid-cols-3 gap-2">
          {kinds.map((k) => {
            const Icon = kindIcons[k];
            return (
              <button type="button" role="radio" aria-checked={kind === k} key={k} onClick={() => setKind(k)} className={cn("flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-medium transition-colors", kind === k ? "border-accent bg-[#fde3df]/50 text-text dark:bg-[#3a1f1d]/50" : "border-line text-text-2 hover:border-text-2/40")}>
                <Icon className="size-5" />
                {kindLabels[k]}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {partySchema[kind].map((f) => (
          <Input
            key={f.key}
            className={cn(f.wide && "sm:col-span-2")}
            label={f.label}
            placeholder={f.placeholder}
            type={f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
            inputMode={f.type && digitTypes.has(f.type) ? "numeric" : f.type === "phone" ? "tel" : undefined}
            maxLength={f.type ? maxLen[f.type] : 500}
            value={data[f.key] ?? ""}
            error={errors[f.key]}
            hint={f.sensitive ? "Не передаётся ИИ" : undefined}
            onChange={(e) => {
              const v = f.type && digitTypes.has(f.type) ? e.target.value.replace(/\D/g, "") : e.target.value;
              setData((d) => ({ ...d, [f.key]: v }));
            }}
          />
        ))}
      </div>
      {message && <p role="alert" className="rounded-xl bg-[#fde3df] px-4 py-3 text-sm text-[#b8392f] dark:bg-[#3a1f1d] dark:text-[#ff9d93]">{message}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button type="submit" loading={busy}>{initial ? "Сохранить" : "Создать карточку"}</Button>
      </div>
    </form>
  );
}
