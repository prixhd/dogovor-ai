import Link from "next/link";
import { ArrowUpRight, Briefcase, FileSignature, Handshake, Home, KeyRound, Wallet, Clock, ListChecks } from "lucide-react";
import { Tag } from "@/components/ui/Card";
import { categories, type TemplateSummary } from "@/lib/catalog";
import { cn } from "@/lib/cn";

const icons: Record<string, typeof Briefcase> = { labor: Briefcase, services: Handshake, realty: Home, sale: KeyRound, finance: Wallet, power: FileSignature };
const tints: Record<string, string> = {
  labor: "bg-[#e3e8ff] text-[#3048c9] dark:bg-[#1d2340] dark:text-[#a9b8ff]",
  services: "bg-[#ece4ff] text-[#5b3bc4] dark:bg-[#271f3d] dark:text-[#c3b1ff]",
  realty: "bg-[#dcf3e9] text-[#1d7a57] dark:bg-[#15302a] dark:text-[#7fe0b6]",
  sale: "bg-[#fbeccb] text-[#8a5a00] dark:bg-[#33280f] dark:text-[#f3c66b]",
  finance: "bg-[#fde3df] text-[#b8392f] dark:bg-[#3a1f1d] dark:text-[#ff9d93]",
  power: "bg-surface-2 text-text",
};

export function TemplateCard({ t, layout = "grid" }: { t: TemplateSummary; layout?: "grid" | "list" }) {
  const Icon = icons[t.category] ?? FileSignature;
  const cat = categories[t.category];
  if (layout === "list") {
    return (
      <Link href={`/c/${t.slug}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", tints[t.category])}><Icon className="size-5" /></span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-base font-bold">{t.title}</span>
          <span className="truncate text-sm text-text-2">{t.description}</span>
        </span>
        {cat && <Tag tone={cat.tone} className="hidden sm:inline-flex">{cat.label}</Tag>}
        <span className="hidden w-20 text-right text-sm text-text-2 md:block">~{t.minutes} мин</span>
        <ArrowUpRight className="size-5 text-text-2 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </Link>
    );
  }
  return (
    <Link href={`/c/${t.slug}`} className="group flex flex-col rounded-[22px] border border-line bg-surface p-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
      <div className={cn("relative grid h-36 place-items-center overflow-hidden rounded-2xl", tints[t.category])}>
        <div className="absolute inset-x-8 top-6 h-full rotate-[-3deg] rounded-xl bg-white/50 dark:bg-white/5" />
        <div className="relative flex h-24 w-20 flex-col gap-1.5 rounded-lg bg-white p-3 shadow-soft transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[-2deg] dark:bg-[#22252c]">
          <Icon className="size-4" />
          <span className="h-1.5 w-full rounded bg-current opacity-20" />
          <span className="h-1.5 w-4/5 rounded bg-current opacity-20" />
          <span className="h-1.5 w-3/5 rounded bg-current opacity-20" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-4">
        <div className="flex items-center gap-2">
          {cat && <Tag tone={cat.tone}>{cat.label}</Tag>}
          {t.status === "draft" && <Tag tone="gray">черновик</Tag>}
        </div>
        <h3 className="font-display text-[17px] font-bold leading-snug">{t.title}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-text-2">{t.description}</p>
        <div className="mt-auto flex items-center gap-4 pt-2 text-[13px] text-text-2">
          <span className="flex items-center gap-1"><Clock className="size-3.5" />~{t.minutes} мин</span>
          <span className="flex items-center gap-1"><ListChecks className="size-3.5" />{t.fieldsCount} полей</span>
        </div>
      </div>
    </Link>
  );
}
