import type { Metadata, Viewport } from "next";
import { Inter, Manrope, PT_Serif } from "next/font/google";
import "./globals.css";
import { themeScript } from "@/components/layout/ThemeToggle";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"], display: "swap" });
const ptSerif = PT_Serif({ variable: "--font-pt-serif", subsets: ["latin", "cyrillic"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "договор.ai: юридические документы за минуты", template: "%s · договор.ai" },
  description: "Конструктор договоров по российскому праву: анкета, заполнение по карточкам сторон и ИИ-помощник. Скачать DOCX бесплатно.",
  openGraph: { type: "website", locale: "ru_RU", siteName: "договор.ai" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F3EC" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0F12" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${manrope.variable} ${ptSerif.variable} min-h-dvh antialiased`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
          Перейти к содержимому
        </a>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
