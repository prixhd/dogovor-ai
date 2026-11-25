"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ModalProps = { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string; footer?: ReactNode };

/** Accessible modal built on the native <dialog> (focus trap + Esc for free). */
export function Modal({ open, onClose, title, children, className, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={cn(
        "m-auto w-[min(560px,calc(100vw-32px))] rounded-3xl border border-line bg-surface p-0 text-text shadow-lift backdrop:bg-[#14151a]/40 backdrop:backdrop-blur-sm open:animate-rise",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <button onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Закрыть">
          <X className="size-5" />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
    </dialog>
  );
}
