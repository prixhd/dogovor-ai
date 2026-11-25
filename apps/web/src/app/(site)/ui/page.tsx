import type { Metadata } from "next";
import { UiShowcase } from "./UiShowcase";

export const metadata: Metadata = { title: "Дизайн-система", robots: { index: false } };

export default function UiPage() {
  return <UiShowcase />;
}
