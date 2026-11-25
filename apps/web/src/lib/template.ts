/** Template schema types (mirror of Go tmpl package JSON) and client helpers. */

export type Option = { value: string; label: string };
export type Field = {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "money" | "date" | "select" | "toggle" | "inn" | "ogrn" | "bik" | "account" | "phone" | "email";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  showIf?: string;
  role?: string;
  bind?: string;
  options?: Option[];
  min?: number;
  max?: number;
  default?: unknown;
  sensitive?: boolean;
};
export type Step = { id: string; title: string; hint?: string; role?: string; fields: Field[] };
export type Role = { id: string; label: string; kinds: string[] };
export type Template = {
  slug: string;
  version: number;
  title: string;
  category: string;
  description: string;
  status: "draft" | "reviewed";
  reviewedAt?: string;
  minutes: number;
  roles: Role[];
  steps: Step[];
};

export type Data = Record<string, unknown>;
export type Edits = {
  replaced?: Record<string, string>;
  deleted?: string[];
  inserted?: { id: string; after: string; style: string; text: string }[];
};
export type Segment = { t: string; f?: string; m?: boolean };
export type RenderedBlock = { id: string; style: string; num?: string; segments?: Segment[]; cols?: Segment[][]; edited?: boolean; inserted?: boolean };
export type RenderedDoc = { title: string; blocks: RenderedBlock[] };

function truthy(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.trim() !== "" && v !== "false";
  if (typeof v === "number") return v !== 0;
  return true;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v).trim();
}

const termRe = /^(!?)\s*([A-Za-z0-9_.]+)\s*(?:(==|!=)\s*'?([^']*?)'?)?$/;

/** Same grammar as Go evalCond: `a`, `!a`, `a == v`, `a != v`, `&&`, `||`. */
export function evalCond(expr: string | undefined, d: Data): boolean {
  if (!expr || !expr.trim()) return true;
  return expr.split("||").some((or) =>
    or.split("&&").every((term) => {
      const m = term.trim().match(termRe);
      if (!m) return false;
      const [, neg, field, op, val] = m;
      if (!op) return truthy(d[field]) !== (neg === "!");
      const eq = str(d[field]) === (val ?? "").trim();
      return op === "==" ? eq : !eq;
    }),
  );
}

export function withDefaults(t: Template, d: Data): Data {
  const out: Data = { ...d };
  for (const s of t.steps) for (const f of s.fields) if (!(f.id in out) && f.default !== undefined) out[f.id] = f.default;
  return out;
}

/** Share of required visible fields filled in a step (0..1). */
export function stepProgress(step: Step, d: Data): number {
  const req = step.fields.filter((f) => f.required && evalCond(f.showIf, d));
  if (!req.length) return 1;
  return req.filter((f) => str(d[f.id]) !== "").length / req.length;
}

export function stepOfField(t: Template, fieldId: string): number {
  return t.steps.findIndex((s) => s.fields.some((f) => f.id === fieldId));
}
