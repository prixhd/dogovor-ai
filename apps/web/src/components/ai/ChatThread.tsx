"use client";

import { ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import type { ChatMessage, Citation } from "@/lib/ai";
import { cn } from "@/lib/cn";

export type ThreadItem = ChatMessage & { citations?: Citation[]; pending?: boolean };

/** Renders a chat transcript with citation chips under assistant answers. */
export function ChatThread({ items, dark }: { items: ThreadItem[]; dark?: boolean }) {
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {items.map((m, i) =>
        m.role === "user" ? (
          <div key={i} className={cn("max-w-[85%] self-end rounded-2xl rounded-br-md px-4 py-2.5 text-[15px]", dark ? "bg-white/10" : "bg-surface-2")}>{m.content}</div>
        ) : (
          <div key={i} className="flex max-w-[95%] gap-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-ai text-white"><Sparkles className="size-3.5" /></span>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {m.content}
                {m.pending && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current align-middle opacity-60" />}
              </p>
              {!!m.citations?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {m.citations.map((c) => (
                    <span
                      key={c.ref}
                      title={c.verified ? `${c.title}: есть в базе норм` : "Нормы нет в нашей базе: не подтверждено"}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        c.verified ? (dark ? "bg-[#15302a] text-[#7fe0b6]" : "bg-[#dcf3e9] text-[#1d7a57]") : dark ? "bg-[#3a1f1d] text-[#ff9d93]" : "bg-[#fde3df] text-[#b8392f]",
                      )}
                    >
                      {c.verified ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                      {c.ref}
                      {!c.verified && " · не подтверждено"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
