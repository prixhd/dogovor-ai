import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <span className="grid size-20 place-items-center rounded-3xl bg-surface shadow-lift"><FileQuestion className="size-9 text-accent" /></span>
      <h1 className="font-display text-5xl font-extrabold tracking-tight">404</h1>
      <p className="max-w-md text-lg text-text-2">Такой страницы нет. Возможно, документ переименовали или ссылка устарела.</p>
      <div className="flex gap-3">
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-line bg-surface px-5 font-medium hover:bg-surface-2">На главную</Link>
        <Link href="/catalog" className="inline-flex h-11 items-center rounded-full bg-accent px-5 font-medium text-accent-ink hover:bg-accent-hover">Каталог документов</Link>
      </div>
    </div>
  );
}
