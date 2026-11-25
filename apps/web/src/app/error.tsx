"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-surface shadow-lift"><AlertTriangle className="size-9 text-danger" /></span>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Что-то пошло не так</h1>
      <p className="max-w-md text-text-2">Мы уже знаем об ошибке. Черновик анкеты сохранён в браузере, его можно открыть снова.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="inline-flex h-11 items-center rounded-full bg-accent px-5 font-medium text-accent-ink hover:bg-accent-hover">Попробовать снова</button>
        <Link href="/" className="inline-flex h-11 items-center rounded-full border border-line bg-surface px-5 font-medium hover:bg-surface-2">На главную</Link>
      </div>
    </div>
  );
}
