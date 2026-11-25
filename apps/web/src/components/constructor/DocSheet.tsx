"use client";

import type { RenderedBlock, RenderedDoc, Segment } from "@/lib/template";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Card";

type Props = {
  doc: RenderedDoc | null;
  activeField?: string;
  onFieldClick?: (id: string) => void;
  /** Block ids to highlight (e.g. AI suggestions under review). */
  highlight?: Record<string, "add" | "change" | "remove">;
  renderExtra?: (b: RenderedBlock) => React.ReactNode;
};

/** The white A4-like "sheet" with live document text. */
export function DocSheet({ doc, activeField, onFieldClick, highlight, renderExtra }: Props) {
  if (!doc) {
    return (
      <div className="doc-sheet mx-auto flex w-full max-w-[760px] flex-col gap-3 rounded-lg p-10 shadow-lift">
        <Skeleton className="mx-auto h-5 w-1/2 !bg-[#eee]" />
        {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className={cn("h-3 !bg-[#eee]", i % 3 === 2 ? "w-2/3" : "w-full")} />)}
      </div>
    );
  }
  const seg = (s: Segment, i: number) => {
    if (!s.f) return <span key={i}>{s.t}</span>;
    return (
      <button
        type="button"
        key={i}
        onClick={() => onFieldClick?.(s.f!)}
        title={s.m ? "Не заполнено: нажмите, чтобы перейти к полю" : "Перейти к полю"}
        className={cn(
          "rounded-[3px] px-0.5 text-left transition-colors [font:inherit]",
          s.m ? "bg-[#fff3d6] text-[#a07400]" : "bg-[#fde3df]/70 hover:bg-[#fde3df]",
          activeField === s.f && "ring-2 ring-[#ef5b50]/50",
        )}
      >
        {s.t}
      </button>
    );
  };
  return (
    <article aria-label="Предпросмотр документа" className="doc-sheet mx-auto w-full max-w-[760px] rounded-lg px-6 py-10 text-[14.5px] leading-[1.65] shadow-lift sm:px-14 sm:py-14">
      {doc.blocks.map((b) => {
        const hl = highlight?.[b.id];
        const cls = cn(
          "relative rounded transition-colors",
          hl === "add" && "bg-[#dcf3e9] outline outline-2 outline-[#2fa67a]/40",
          hl === "change" && "bg-[#e8ecff] outline outline-2 outline-[#4f6bff]/40",
          hl === "remove" && "bg-[#fde3df] line-through opacity-70",
          (b.edited || b.inserted) && !hl && "border-l-2 border-[#4f6bff]/60 pl-2",
        );
        let el: React.ReactNode;
        switch (b.style) {
          case "title":
            el = <h2 className="text-center text-[17px] font-bold tracking-wide">{b.segments?.map(seg)}</h2>;
            break;
          case "subtitle":
            el = <p className="mb-6 flex justify-between gap-4 whitespace-pre-wrap text-[13.5px]">{b.segments?.map(seg)}</p>;
            break;
          case "heading":
            el = <h3 className="mt-6 text-center font-bold">{b.num} {b.segments?.map(seg)}</h3>;
            break;
          case "right":
            el = <p className="text-right">{b.segments?.map(seg)}</p>;
            break;
          case "cols":
            el = (
              <div className="mt-2 grid gap-6 text-[13px] sm:grid-cols-2">
                {b.cols?.map((c, i) => <p key={i} className="whitespace-pre-wrap">{c.map(seg)}</p>)}
              </div>
            );
            break;
          default:
            el = <p className="text-justify">{b.num && <span className="mr-1">{b.num}</span>}{b.segments?.map(seg)}</p>;
        }
        return (
          <div key={b.id} id={`blk-${b.id}`} data-block={b.id} className={cn("mb-2.5", cls)}>
            {el}
            {renderExtra?.(b)}
          </div>
        );
      })}
    </article>
  );
}
