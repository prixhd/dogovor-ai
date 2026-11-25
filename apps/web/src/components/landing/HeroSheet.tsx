import { Sparkles, Check } from "lucide-react";

/** Decorative document mock-up for the hero. */
export function HeroSheet() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[460px] select-none">
      <div className="absolute -left-6 top-10 h-[88%] w-[92%] rotate-[-5deg] rounded-[22px] bg-accent/90" />
      <div className="doc-sheet relative rotate-[1.5deg] rounded-[22px] p-8 shadow-lift">
        <p className="text-center text-[13px] font-bold tracking-[0.2em]">ТРУДОВОЙ ДОГОВОР № 14</p>
        <p className="mt-1 text-center text-[11px] text-[#666]">г. Москва · 25 ноября 2026 г.</p>
        <div className="mt-5 space-y-2 text-[12px] leading-relaxed">
          <p>
            <span className="rounded bg-[#fde3df] px-1">ООО «Ромашка»</span>, именуемое в дальнейшем «Работодатель», и{" "}
            <span className="rounded bg-[#fde3df] px-1">Петров Пётр Петрович</span>, именуемый «Работник», заключили настоящий договор:
          </p>
          <p className="font-bold">1. Предмет договора</p>
          <p>1.1. Работник принимается на должность <span className="rounded bg-[#fde3df] px-1">менеджера по продажам</span>.</p>
          <p className="rounded-md bg-[#e8ecff] px-1.5 py-1 text-[#2c3fb0]">
            1.2. Работнику устанавливается испытание сроком 3 месяца (ст. 70 ТК РФ).
          </p>
          <div className="space-y-1.5 pt-1">
            <div className="h-2 w-full rounded bg-[#eee]" />
            <div className="h-2 w-11/12 rounded bg-[#eee]" />
            <div className="h-2 w-4/5 rounded bg-[#eee]" />
          </div>
        </div>
      </div>
      <div className="absolute -right-2 top-[46%] flex animate-rise items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[13px] font-medium shadow-lift [animation-delay:.4s] sm:-right-10">
        <span className="grid size-7 place-items-center rounded-full bg-ai text-white"><Sparkles className="size-3.5" /></span>
        ИИ добавил пункт про испытание
      </div>
      <div className="absolute -bottom-5 left-4 flex animate-rise items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[13px] font-medium shadow-lift [animation-delay:.7s]">
        <span className="grid size-7 place-items-center rounded-full bg-success text-white"><Check className="size-3.5" /></span>
        Реквизиты из карточки
      </div>
    </div>
  );
}
