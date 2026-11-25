"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, IdCard, LogOut, MessageSquare, PanelLeft, Plus, Settings, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LinkButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/account", label: "Документы", icon: FileText },
  { href: "/account/cards", label: "Карточки сторон", icon: IdCard },
  { href: "/account/chat", label: "ИИ-чат", icon: MessageSquare },
  { href: "/account/settings", label: "Настройки", icon: Settings },
];

/** Cabinet layout in the spirit of design/v2.jpg: soft sidebar + content panel. */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [loading, user, path, router]);
  useEffect(() => setOpen(false), [path]);

  const sidebar = (
    <div className="flex h-full flex-col gap-8 p-5">
      <div className="flex items-center justify-between">
        <Logo />
        <button className="grid size-9 place-items-center rounded-full hover:bg-surface-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Закрыть меню"><X className="size-5" /></button>
      </div>
      <LinkButton href="/catalog" size="md" className="w-full"><Plus className="size-4" />Новый документ</LinkButton>
      <nav aria-label="Кабинет" className="flex flex-col gap-1">
        <p className="mb-1 px-3 text-xs font-medium text-text-2">Разделы</p>
        {nav.map((n) => {
          const active = n.href === "/account" ? path === "/account" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors", active ? "bg-surface font-semibold shadow-soft" : "text-text-2 hover:bg-surface/60 hover:text-text")}>
              <n.icon className="size-[18px]" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft">
          {user ? (
            <>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-[#ff9d6e] font-bold text-white">{(user.name || user.email)[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name || "Без имени"}</p>
                <p className="truncate text-xs text-text-2">{user.email}</p>
              </div>
            </>
          ) : (
            <Skeleton className="h-10 w-full" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button onClick={async () => { await logout(); router.push("/"); }} className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-text-2 hover:bg-surface hover:text-text"><LogOut className="size-4" />Выйти</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[color-mix(in_srgb,var(--surface-2)_70%,var(--bg))] lg:p-3">
      <aside className="fixed inset-y-3 left-3 hidden w-[272px] rounded-3xl bg-[color-mix(in_srgb,var(--surface-2)_60%,transparent)] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-[290px] animate-rise bg-bg" onClick={(e) => e.stopPropagation()}>{sidebar}</aside>
        </div>
      )}
      <div className="flex min-h-dvh flex-col bg-surface lg:ml-[284px] lg:min-h-[calc(100dvh-24px)] lg:rounded-3xl lg:border lg:border-line lg:shadow-soft">
        <div className="flex h-16 items-center gap-3 border-b border-line px-4 lg:hidden">
          <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Открыть меню"><PanelLeft className="size-5" /></button>
          <Logo />
        </div>
        <main id="main" className="flex-1">{loading || !user ? <div className="flex flex-col gap-4 p-8"><Skeleton className="h-8 w-60" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div> : children}</main>
      </div>
    </div>
  );
}

export function PageHead({ crumbs, title, actions }: { crumbs: string[]; title: string; actions?: React.ReactNode }) {
  return (
    <>
      <nav aria-label="Хлебные крошки" className="flex h-16 items-center gap-2 border-b border-line px-5 text-[15px] sm:px-8">
        <FileText className="size-4 text-text-2" />
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            {i > 0 && <span className="text-text-2" aria-hidden>•</span>}
            <span className={i === crumbs.length - 1 ? "text-text-2" : "font-medium"}>{c}</span>
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 sm:px-8">
        <h1 className="font-display text-xl font-bold">{title}</h1>
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </>
  );
}
