"use client";

import { PageHead } from "@/components/account/AccountShell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHead crumbs={["Кабинет", "Настройки"]} title="Настройки" />
      <div className="flex max-w-2xl flex-col gap-4 px-5 py-6 sm:px-8">
        <section className="rounded-2xl border border-line p-5">
          <h2 className="font-semibold">Профиль</h2>
          <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-2 text-[15px]">
            <dt className="text-text-2">Имя</dt><dd>{user?.name || "не указано"}</dd>
            <dt className="text-text-2">Почта</dt><dd>{user?.email}</dd>
          </dl>
        </section>
        <section className="flex items-center justify-between rounded-2xl border border-line p-5">
          <div><h2 className="font-semibold">Тема оформления</h2><p className="text-sm text-text-2">Светлая или тёмная</p></div>
          <ThemeToggle />
        </section>
        <section className="rounded-2xl border border-line p-5">
          <h2 className="font-semibold">Данные</h2>
          <p className="mt-1 text-sm text-text-2">Документы и карточки можно удалить в соответствующих разделах. Полное удаление аккаунта появится в следующей версии; пока напишите в поддержку.</p>
        </section>
      </div>
    </>
  );
}
