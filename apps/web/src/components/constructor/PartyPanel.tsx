"use client";

import type { Data, Template } from "@/lib/template";

export function PartyPanel(// eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: { template: Template; data: Data; setData: (fn: (d: Data) => Data) => void }) {
  return <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-text-2">Карточки сторон появятся после входа.</div>;
}
