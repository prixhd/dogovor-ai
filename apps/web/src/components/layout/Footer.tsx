import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-text-2">
            Конструктор документов по российскому праву. Помогает составить документ, но не заменяет консультацию юриста.
          </p>
        </div>
        <FooterCol title="Документы" links={[["Трудовой договор", "/c/trudovoy-dogovor"], ["Договор аренды квартиры", "/c/arenda-zhilya"], ["Договор оказания услуг", "/c/okazanie-uslug"], ["Все документы", "/catalog"]]} />
        <FooterCol title="Сервис" links={[["Как это работает", "/#how"], ["ИИ-помощник", "/#ai"], ["Безопасность", "/#security"], ["Вопросы и ответы", "/#faq"]]} />
        <FooterCol title="Аккаунт" links={[["Войти", "/login"], ["Регистрация", "/register"], ["Личный кабинет", "/account"]]} />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-5 text-[13px] text-text-2 sm:flex-row sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} договор.ai</span>
          <span>Шаблоны в статусе «черновик»: не проверены юристом</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="text-sm text-text-2 transition-colors hover:text-text">{label}</Link>
      ))}
    </div>
  );
}
