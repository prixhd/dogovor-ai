import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect x="4" y="2" width="20" height="26" rx="5" fill="var(--accent)" />
      <rect x="9" y="6" width="20" height="24" rx="5" fill="var(--text)" />
      <path d="M14 14h10M14 18.5h10M14 23h6" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight", className)} aria-label="договор.ai: на главную">
      <LogoMark />
      <span>
        договор<span className="text-accent">.ai</span>
      </span>
    </Link>
  );
}
