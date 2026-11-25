import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Constructor, type Mode } from "@/components/constructor/Constructor";
import type { Template } from "@/lib/template";

async function fetchTemplate(slug: string): Promise<Template | null> {
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:8080";
  try {
    const res = await fetch(`${base}/templates/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return ((await res.json()) as { template: Template }).template;
  } catch {
    return null;
  }
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ doc?: string; mode?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await fetchTemplate((await params).slug);
  if (!t) return { title: "Документ не найден" };
  return {
    title: `${t.title}: заполнить онлайн`,
    description: t.description,
    alternates: { canonical: `/c/${t.slug}` },
    openGraph: { title: `${t.title}: образец и конструктор`, description: t.description, type: "website" },
  };
}

export default async function ConstructorPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const t = await fetchTemplate(slug);
  if (!t) notFound();
  const docId = sp.doc && /^[0-9a-f-]{36}$/.test(sp.doc) ? sp.doc : null;
  const mode: Mode = sp.mode === "cards" || sp.mode === "ai" ? sp.mode : "form";
  return <Constructor key={docId ?? "new"} template={t} docId={docId} initialMode={mode} />;
}
