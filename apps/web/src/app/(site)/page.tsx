import Link from "next/link";
import { ArrowRight, Check, ClipboardList, IdCard, Lock, ShieldCheck, Sparkles, Download, EyeOff, Scale, ServerCog } from "lucide-react";
import { HeroSearch } from "@/components/landing/HeroSearch";
import { HeroSheet } from "@/components/landing/HeroSheet";
import { Topic } from "@/components/landing/Topic";
import { PublicChat } from "@/components/ai/PublicChat";
import { TemplateCard } from "@/components/catalog/TemplateCard";
import { Skeleton } from "@/components/ui/Card";
import { fetchCatalog } from "@/lib/catalog";

const faq = [
  ["Это бесплатно?", "Да. Анкета, предпросмотр, скачивание DOCX и ИИ-помощник с дневным лимитом вопросов бесплатны. Для скачивания и сохранения нужен вход: так документы и карточки сторон остаются в вашем профиле."],
  ["Можно ли использовать документ без юриста?", "Шаблоны составлены по тексту законов и типовой практике, но пока имеют статус «черновик»: юрист их ещё не проверил. Для важных сделок покажите документ специалисту."],
  ["Откуда ИИ берёт ссылки на статьи?", "ИИ опирается на нашу базу выдержек из ТК РФ и ГК РФ. Если нужной нормы в базе нет, ответ помечается «не подтверждено»: мы не выдаём придуманные статьи."],
  ["ИИ сам меняет мой договор?", "Нет. ИИ только предлагает правки. Каждую вы видите как подсвеченную разницу и принимаете или отклоняете отдельно."],
  ["Что такое карточки сторон?", "Сохранённые реквизиты: ваша компания, ИП или физлицо. Выберите карточку для роли «Работодатель» или «Арендатор», и поля заполнятся сами."],
  ["Где хранятся мои данные?", "В базе сервиса, доступ только у вас. Паспортные данные не отправляются в ИИ, а документы и карточки можно удалить в любой момент."],
];

export default async function Home() {
  const templates = await fetchCatalog();
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] size-[620px] rounded-full bg-accent/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute left-[-15%] top-60 size-[480px] rounded-full bg-ai/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-16 px-4 pb-24 pt-14 sm:px-6 md:pt-24 lg:grid-cols-[1.15fr_1fr] lg:pb-32">
          <div className="flex flex-col items-start gap-7">
            <span className="inline-flex animate-rise items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium shadow-soft">
              <span className="size-2 rounded-full bg-success" /> Бесплатно · по российскому праву
            </span>
            <h1 className="animate-rise font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] [animation-delay:.05s] sm:text-6xl lg:text-[68px]">
              Договор за&nbsp;5&nbsp;минут, <span className="relative whitespace-nowrap text-accent">без юриста<svg aria-hidden viewBox="0 0 300 20" className="absolute -bottom-2 left-0 h-3 w-full"><path d="M3 14c60-9 180-14 294-6" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" /></svg></span> и&nbsp;скуки
            </h1>
            <p className="max-w-xl animate-rise text-lg leading-relaxed text-text-2 [animation-delay:.1s] sm:text-xl">
              Ответьте на простые вопросы, подставьте реквизиты из карточки, а ИИ подскажет нормы и предложит правки. Готовый документ скачается в Word.
            </p>
            <div className="w-full animate-rise [animation-delay:.15s]"><HeroSearch /></div>
          </div>
          <HeroSheet />
        </div>
      </section>

      {/* Popular */}
      <section aria-labelledby="popular-title" className="mx-auto max-w-[1240px] px-4 pb-28 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 id="popular-title" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Популярные документы</h2>
            <p className="mt-2 text-text-2">Самое нужное: от трудового договора до доверенности.</p>
          </div>
          <Link href="/catalog" className="hidden items-center gap-1.5 font-medium text-accent hover:underline sm:flex">Весь каталог <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.length
            ? templates.slice(0, 6).map((t) => <TemplateCard key={t.slug} t={t} />)
            : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[300px] rounded-[22px]" />)}
        </div>
      </section>

      <Topic id="how" num="01" title="Как это работает" kicker="Три шага до готового файла">
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            [ClipboardList, "Ответьте на вопросы", "Анкета по шагам: только то, что нужно для вашего документа. Лист справа обновляется на лету."],
            [IdCard, "Подставьте реквизиты", "Выберите сохранённую карточку компании или человека, или вставьте реквизиты текстом: ИИ разложит их по полям."],
            [Download, "Скачайте документ", "Проверьте текст, при желании доработайте с ИИ и скачайте .docx. Документ сохранится в кабинете."],
          ].map(([Icon, title, text], i) => {
            const I = Icon as typeof ClipboardList;
            return (
              <li key={i} className="relative flex flex-col gap-4 rounded-3xl border border-line bg-surface p-7 shadow-soft">
                <span className="font-display text-6xl font-extrabold text-surface-2 [-webkit-text-stroke:1.5px_var(--line)]">0{i + 1}</span>
                <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-ink"><I className="size-5" /></span>
                <h3 className="font-display text-xl font-bold">{title as string}</h3>
                <p className="leading-relaxed text-text-2">{text as string}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-12 grid gap-4 rounded-3xl border border-line bg-surface p-6 sm:p-8 md:grid-cols-3">
          {[
            ["Конструктор", "Классическая анкета без ИИ: работает всегда и для всех."],
            ["По карточке", "Реквизиты сторон из профиля в один клик."],
            ["С ИИ", "Вопросы по нормам и правки в пользу нужной стороны."],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-4">
              <span className="font-display text-sm font-bold text-accent">{String.fromCharCode(65 + i)}</span>
              <div><p className="font-semibold">{t}</p><p className="mt-1 text-sm text-text-2">{d}</p></div>
            </div>
          ))}
        </div>
      </Topic>

      <Topic id="ai" num="02" title="ИИ-помощник" kicker="Подсказывает, но не решает за вас" dark>
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-6">
            <p className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Спросите про нормы или попросите сделать договор <span className="text-[#8fa2ff]">в&nbsp;пользу вашей стороны</span>.
            </p>
            <ul className="flex flex-col gap-4 text-white/75">
              {[
                "Ответы со ссылками на статьи ТК РФ и ГК РФ из нашей базы",
                "Правки в виде подсвеченной разницы: принять или отклонить",
                "Разбор реквизитов из вставленного текста по полям",
                "Неподтверждённые ответы помечаются честно",
              ].map((x) => (
                <li key={x} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-[#5fd3a0]" />{x}</li>
              ))}
            </ul>
            <p className="text-sm text-white/45">ИИ помогает составить документ, но не заменяет консультацию юриста.</p>
          </div>
          <PublicChat />
        </div>
      </Topic>

      <Topic id="security" num="03" title="Безопасность" kicker="Ваши данные остаются вашими">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Lock, "Шифрованные пароли", "Пароли хранятся только как хеш argon2id, сессии в защищённых cookie."],
            [EyeOff, "Минимум данных в ИИ", "Паспортные данные и лишние персональные сведения не уходят в модель."],
            [ShieldCheck, "Доступ только у вас", "Каждый запрос проверяет владельца документа или карточки."],
            [ServerCog, "Лимиты и защита", "Ограничение частоты входа и ИИ-запросов, защита от подмены запросов."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Lock;
            return (
              <div key={t as string} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-6 shadow-soft">
                <span className="grid size-11 place-items-center rounded-xl bg-surface-2"><I className="size-5" /></span>
                <h3 className="font-display text-lg font-bold">{t as string}</h3>
                <p className="text-sm leading-relaxed text-text-2">{d as string}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex items-start gap-4 rounded-3xl border border-[#f3c66b]/50 bg-[#fbeccb]/50 p-6 dark:bg-[#33280f]/40">
          <Scale className="mt-0.5 size-6 shrink-0 text-[#8a5a00] dark:text-[#f3c66b]" />
          <p className="text-[15px] leading-relaxed">
            <b>Честно о статусе шаблонов.</b> Все документы сейчас помечены как «черновик»: они написаны по тексту законов, но ещё не проверены юристом. Мы покажем дату проверки, когда она появится.
          </p>
        </div>
      </Topic>

      <Topic id="faq" num="04" title="Вопросы и ответы" kicker="Коротко о главном">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {faq.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-line bg-surface px-6 shadow-soft open:shadow-lift">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-lg font-bold [&::-webkit-details-marker]:hidden">
                {q}
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-xl transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-6 leading-relaxed text-text-2">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-20 flex flex-col items-center gap-6 rounded-[32px] bg-accent px-6 py-16 text-center text-accent-ink">
          <Sparkles className="size-8" />
          <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Соберите первый документ прямо сейчас</h2>
          <Link href="/catalog" className="inline-flex h-14 items-center gap-2 rounded-full bg-[#14151a] px-8 font-medium text-white transition-transform hover:scale-[1.02]">
            Выбрать документ <ArrowRight className="size-4" />
          </Link>
        </div>
      </Topic>
    </>
  );
}
