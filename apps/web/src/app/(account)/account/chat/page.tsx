"use client";

import { useEffect, useState } from "react";
import { PageHead } from "@/components/account/AccountShell";
import { ChatPanel } from "@/components/ai/ChatPanel";
import { api } from "@/lib/api";

export default function ChatPage() {
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  useEffect(() => {
    api<{ remaining: number; limit: number }>("/ai/quota").then(setQuota).catch(() => {});
  }, []);
  return (
    <div className="flex h-[calc(100dvh-24px)] flex-col max-lg:h-[calc(100dvh-64px)]">
      <PageHead crumbs={["Кабинет", "ИИ-чат"]} title="ИИ-чат по нормам" actions={quota && <span className="rounded-full bg-ai-soft px-3 py-1 text-xs font-semibold text-ai">Осталось сегодня: {quota.remaining} из {quota.limit}</span>} />
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
        <ChatPanel className="flex-1" onQuota={setQuota} examples={["Сколько дней отпуска положено по закону?", "Нужна ли нотариальная доверенность на продажу квартиры?", "Можно ли расторгнуть договор аренды досрочно?"]} />
      </div>
      <p className="border-t border-line px-5 py-3 text-center text-xs text-text-2">ИИ опирается на выдержки из ТК РФ и ГК РФ и не заменяет консультацию юриста.</p>
    </div>
  );
}
