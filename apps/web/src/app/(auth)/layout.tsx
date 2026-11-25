import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { HeroSheet } from "@/components/landing/HeroSheet";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <main id="main" className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
        <p className="text-center text-xs text-text-2">Продолжая, вы соглашаетесь с обработкой данных для работы сервиса. Документы видны только вам.</p>
      </div>
      <aside aria-hidden className="relative hidden overflow-hidden bg-ink-block p-12 text-[#eceef2] lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-32 -top-32 size-[520px] rounded-full bg-[#ef5b50]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[460px] rounded-full bg-[#4f6bff]/25 blur-3xl" />
        <blockquote className="relative max-w-md">
          <p className="font-display text-3xl font-bold leading-tight tracking-tight">«Документы перестали пугать: ответил на вопросы, подставил реквизиты, скачал.»</p>
          <footer className="mt-4 text-sm text-white/50">Так мы хотим, чтобы о нас говорили</footer>
        </blockquote>
        <div className="relative scale-[.85]"><HeroSheet /></div>
        <div className="relative flex gap-8 text-sm text-white/60">
          <span><b className="block font-display text-2xl text-white">6</b>шаблонов</span>
          <span><b className="block font-display text-2xl text-white">~5 мин</b>на документ</span>
          <span><b className="block font-display text-2xl text-white">0 ₽</b>навсегда</span>
        </div>
      </aside>
    </div>
  );
}
