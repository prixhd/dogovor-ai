import type { TagTone } from "@/components/ui/Card";

/** Presentation metadata for catalog categories (titles come from the API). */
export const categories: Record<string, { label: string; tone: TagTone }> = {
  labor: { label: "Трудовые", tone: "blue" },
  services: { label: "Услуги", tone: "violet" },
  realty: { label: "Недвижимость", tone: "green" },
  sale: { label: "Купля-продажа", tone: "amber" },
  finance: { label: "Займы", tone: "coral" },
  power: { label: "Доверенности", tone: "gray" },
};

export type TemplateSummary = {
  slug: string;
  title: string;
  category: string;
  description: string;
  status: "draft" | "reviewed";
  fieldsCount: number;
  minutes: number;
};

/** Server-side fetch of the catalog from the Go API (cached for a minute). */
export async function fetchCatalog(): Promise<TemplateSummary[]> {
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:8080";
  try {
    const res = await fetch(`${base}/templates`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const body = (await res.json()) as { templates: TemplateSummary[] };
    return body.templates;
  } catch {
    return [];
  }
}
