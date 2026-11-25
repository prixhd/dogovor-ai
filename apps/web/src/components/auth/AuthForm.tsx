"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const oauthErrors: Record<string, string> = {
  yandex_not_configured: "Вход через Яндекс пока не подключён. Войдите по почте и паролю.",
  yandex_failed: "Не удалось войти через Яндекс. Попробуйте ещё раз или войдите по почте.",
};

function safeNext(p: string | null) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/account";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const next = safeNext(params.get("next"));
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState(oauthErrors[params.get("error") ?? ""] ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      await api(`/auth/${mode}`, { method: "POST", json: mode === "login" ? { email: form.email, password: form.password } : form });
      await refresh();
      router.push(next);
    } catch (err) {
      if (err instanceof ApiError) {
        setMessage(err.message);
      } else setMessage("Сеть недоступна. Попробуйте ещё раз.");
      try {
        const body = (err as { fields?: Record<string, string> }).fields;
        if (body) setErrors(body);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === "login";
  return (
    <div className="flex animate-rise flex-col gap-7">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{isLogin ? "С возвращением" : "Создайте аккаунт"}</h1>
        <p className="mt-2 text-text-2">{isLogin ? "Войдите, чтобы скачивать и хранить документы." : "Бесплатно. Документы и карточки сторон будут в вашем кабинете."}</p>
      </div>
      <a
        href={`/api/auth/yandex/start?next=${encodeURIComponent(next)}`}
        className="flex h-12 items-center justify-center gap-3 rounded-full border border-line bg-surface font-medium transition-colors hover:bg-surface-2"
      >
        <span className="grid size-6 place-items-center rounded-full bg-[#fc3f1d] text-sm font-bold text-white">Я</span>
        Войти через Яндекс ID
      </a>
      <div className="flex items-center gap-4 text-sm text-text-2"><span className="h-px flex-1 bg-line" />или по почте<span className="h-px flex-1 bg-line" /></div>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {!isLogin && <Input label="Имя" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="Как к вам обращаться" />}
        <Input label="Почта" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} placeholder="you@example.ru" />
        <Input
          label="Пароль"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          hint={isLogin ? undefined : "Не короче 8 символов"}
        />
        {message && <p role="alert" className="rounded-xl bg-[#fde3df] px-4 py-3 text-sm text-[#b8392f] dark:bg-[#3a1f1d] dark:text-[#ff9d93]">{message}</p>}
        <Button type="submit" size="lg" loading={busy} className="mt-1">{isLogin ? "Войти" : "Зарегистрироваться"}</Button>
      </form>
      <p className="text-center text-sm text-text-2">
        {isLogin ? "Нет аккаунта? " : "Уже есть аккаунт? "}
        <Link href={`/${isLogin ? "register" : "login"}${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:underline">
          {isLogin ? "Зарегистрироваться" : "Войти"}
        </Link>
      </p>
    </div>
  );
}
