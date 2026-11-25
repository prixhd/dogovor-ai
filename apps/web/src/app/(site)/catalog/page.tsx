import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogView } from "./CatalogView";
import { fetchCatalog } from "@/lib/catalog";
import { Skeleton } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Каталог документов",
  description: "Трудовой договор, аренда, купля-продажа, займ, оказание услуг, доверенность: заполните анкету и скачайте DOCX.",
};

export default async function CatalogPage() {
  const templates = await fetchCatalog();
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-10 sm:px-6 sm:pt-14">
      <nav aria-label="Хлебные крошки" className="mb-6 flex items-center gap-2 text-sm text-text-2">
        <Link href="/" className="hover:text-text">Главная</Link>
        <span aria-hidden>•</span>
        <span className="text-text">Документы</span>
      </nav>
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Каталог документов</h1>
      <p className="mt-3 max-w-2xl text-lg text-text-2">Выберите документ: анкета займёт несколько минут, а лист документа будет собираться у вас на глазах.</p>
      <Suspense fallback={<Skeleton className="mt-10 h-96" />}>
        <CatalogView templates={templates} />
      </Suspense>
    </div>
  );
}
