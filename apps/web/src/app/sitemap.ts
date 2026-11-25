import type { MetadataRoute } from "next";
import { fetchCatalog } from "@/lib/catalog";

// Rendered per request (catalog comes from the API, cached 60s); a build
// without a running API must not bake an empty catalog into the page.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const templates = await fetchCatalog();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "weekly", priority: 0.9 },
    ...templates.map((t) => ({ url: `${base}/c/${t.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
