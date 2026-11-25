"use client";

import type { Data, Edits, RenderedDoc, Template } from "@/lib/template";

type Props = {
  template: Template;
  doc: RenderedDoc | null;
  data: Data;
  edits: Edits;
  setEdits: (e: Edits) => void;
  setData: (fn: (d: Data) => Data) => void;
  setHighlight: (h: Record<string, "add" | "change" | "remove">) => void;
  className?: string;
};

export function AIPanel({ className }: Props) {
  return <aside className={className}>ИИ-панель</aside>;
}
