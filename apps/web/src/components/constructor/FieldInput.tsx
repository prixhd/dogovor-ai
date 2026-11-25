"use client";

import { Input, Select, Textarea, Toggle } from "@/components/ui/Field";
import type { Field } from "@/lib/template";

type Props = { field: Field; value: unknown; error?: string; onChange: (v: unknown) => void; onBlur?: () => void };

const inputMode: Partial<Record<Field["type"], "numeric" | "decimal" | "tel" | "email">> = {
  number: "numeric", money: "decimal", inn: "numeric", ogrn: "numeric", bik: "numeric", account: "numeric", phone: "tel", email: "email",
};
const maxLen: Partial<Record<Field["type"], number>> = { inn: 12, ogrn: 15, bik: 9, account: 20 };

export function FieldInput({ field: f, value, error, onChange, onBlur }: Props) {
  const v = value === undefined || value === null ? "" : String(value);
  const common = { label: f.label, hint: f.hint, error, required: f.required, placeholder: f.placeholder, onBlur, name: f.id, "data-field": f.id };
  switch (f.type) {
    case "toggle":
      return <Toggle checked={value === true || value === "true"} onChange={onChange} label={f.label} hint={f.hint} />;
    case "select":
      return <Select {...common} value={v} onChange={(e) => onChange(e.target.value)} options={[...(f.required || f.default ? [] : [{ value: "", label: "Не выбрано" }]), ...(f.options ?? [])]} />;
    case "textarea":
      return <Textarea {...common} value={v} onChange={(e) => onChange(e.target.value)} maxLength={5000} />;
    case "date":
      return <Input {...common} type="date" value={v} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return (
        <Input {...common} type="text" inputMode="numeric" value={v} onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          onChange(raw === "" ? "" : Number(raw));
        }} />
      );
    default:
      return (
        <Input
          {...common}
          type={f.type === "email" ? "email" : "text"}
          inputMode={inputMode[f.type]}
          maxLength={maxLen[f.type] ?? 500}
          autoComplete={f.sensitive ? "off" : undefined}
          value={v}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(["inn", "ogrn", "bik", "account"].includes(f.type) ? raw.replace(/\D/g, "") : f.type === "money" ? raw.replace(/[^\d.,\s]/g, "") : raw);
          }}
        />
      );
  }
}
