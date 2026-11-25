import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-soft", className)} {...rest} />;
}

const tagTones = {
  coral: "bg-[#fde3df] text-[#b8392f] dark:bg-[#3a1f1d] dark:text-[#ff9d93]",
  blue: "bg-[#e3e8ff] text-[#3048c9] dark:bg-[#1d2340] dark:text-[#a9b8ff]",
  green: "bg-[#dcf3e9] text-[#1d7a57] dark:bg-[#15302a] dark:text-[#7fe0b6]",
  amber: "bg-[#fbeccb] text-[#8a5a00] dark:bg-[#33280f] dark:text-[#f3c66b]",
  violet: "bg-[#ece4ff] text-[#5b3bc4] dark:bg-[#271f3d] dark:text-[#c3b1ff]",
  gray: "bg-surface-2 text-text-2",
} as const;

export type TagTone = keyof typeof tagTones;

export function Tag({ tone = "gray", className, ...rest }: ComponentProps<"span"> & { tone?: TagTone }) {
  return <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold tracking-wide", tagTones[tone], className)} {...rest} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-xl", className)} />;
}
