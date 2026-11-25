"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LinkButton } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/catalog", label: "Документы" },
  { href: "/#how", label: "Как это работает" },
  { href: "/#ai", label: "ИИ-помощник" },
  { href: "/#faq", label: "Вопросы" },
];

export function Header() {
  const path = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Главное меню">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={cn("rounded-full px-4 py-2 text-[15px] font-medium text-text-2 transition-colors hover:text-text", path === n.href && "text-accent")}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {!loading && (user ? (
            <LinkButton href="/account" variant="secondary" size="sm" className="max-sm:hidden">
              <span className="grid size-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">{(user.name || user.email)[0]?.toUpperCase()}</span>
              Кабинет
            </LinkButton>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 text-[15px] font-medium text-text-2 hover:text-text sm:block">Войти</Link>
              <LinkButton href="/catalog" size="sm" className="max-sm:hidden">Создать документ</LinkButton>
            </>
          ))}
          <button className="grid size-10 place-items-center rounded-full hover:bg-surface-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Меню" aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-b border-line bg-bg px-4 pb-4 lg:hidden">
          <nav className="flex flex-col" aria-label="Мобильное меню">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-3 text-base font-medium">{n.label}</Link>
            ))}
            <Link href={user ? "/account" : "/login"} onClick={() => setOpen(false)} className="py-3 text-base font-medium text-accent">
              {user ? "Личный кабинет" : "Войти"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
