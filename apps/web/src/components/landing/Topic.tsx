import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TopicProps = { id: string; num: string; title: string; kicker: string; children: ReactNode; dark?: boolean };

/**
 * A landing section whose header pins under the site header while the
 * section is on screen; the next Topic's header pushes it out (each header is
 * sticky only inside its own section).
 */
export function Topic({ id, num, title, kicker, children, dark }: TopicProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("topic", dark && "bg-ink-block text-[#eceef2]")}>
      <div className={cn("topic-head border-b", dark ? "border-white/10 bg-ink-block/85" : "border-line/70 bg-bg/85")}>
        <div className="topic-head-inner mx-auto flex max-w-[1240px] origin-left items-baseline gap-4 px-4 py-5 sm:gap-6 sm:px-6">
          <span className={cn("font-display text-sm font-bold tabular-nums", dark ? "text-[#8fa2ff]" : "text-accent")}>{num}</span>
          <h2 id={`${id}-title`} className="font-display text-2xl font-extrabold tracking-tight sm:text-[34px]">{title}</h2>
          <span className={cn("ml-auto hidden text-sm md:block", dark ? "text-white/50" : "text-text-2")}>{kicker}</span>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-12 sm:px-6 sm:pb-36 sm:pt-16">{children}</div>
    </section>
  );
}
