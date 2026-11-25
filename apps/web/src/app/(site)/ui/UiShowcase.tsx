"use client";

import { useState } from "react";
import { Sparkles, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Toggle, Checkbox } from "@/components/ui/Field";
import { Card, Tag, Skeleton } from "@/components/ui/Card";
import { Table, Th, Td } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const swatches = [
  ["Фон", "bg-bg"], ["Поверхность", "bg-surface"], ["Поверхность 2", "bg-surface-2"], ["Линия", "bg-line"],
  ["Текст", "bg-text"], ["Текст 2", "bg-text-2"], ["Акцент", "bg-accent"], ["ИИ", "bg-ai"], ["Успех", "bg-success"], ["Риск", "bg-danger"],
];

export function UiShowcase() {
  const [modal, setModal] = useState(false);
  const [on, setOn] = useState(true);
  const toast = useToast();
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-16 px-4 py-16 sm:px-6">
      <header className="flex flex-col gap-3">
        <Tag tone="violet" className="self-start">Витрина</Tag>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Дизайн-система</h1>
        <p className="max-w-2xl text-lg text-text-2">Токены, типографика и компоненты договор.ai. Переключите тему в шапке, чтобы проверить тёмную версию.</p>
      </header>

      <Section title="Цвета">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {swatches.map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-2">
              <div className={`h-20 rounded-2xl border border-line ${cls}`} />
              <span className="text-sm text-text-2">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Типографика">
        <div className="flex flex-col gap-3">
          <p className="font-display text-6xl font-extrabold tracking-tight">Документ за 5 минут</p>
          <p className="font-display text-3xl font-bold tracking-tight">Заголовок раздела, Manrope</p>
          <p className="text-lg">Основной текст, Inter 18. Простым русским языком, без канцелярита.</p>
          <p className="text-sm text-text-2">Вторичный текст, Inter 14.</p>
          <div className="doc-sheet mt-2 rounded-xl p-6 text-[15px] leading-relaxed shadow-soft">1.1. Работодатель предоставляет Работнику работу по обусловленной трудовой функции (PT Serif).</div>
        </div>
      </Section>

      <Section title="Кнопки">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Создать документ</Button>
          <Button variant="secondary"><Download className="size-4" />Скачать .docx</Button>
          <Button variant="ai"><Sparkles className="size-4" />Спросить ИИ</Button>
          <Button variant="ghost">Отмена</Button>
          <Button variant="danger">Удалить</Button>
          <Button loading>Сохраняем</Button>
          <Button size="sm">Маленькая</Button>
          <Button size="lg">Большая</Button>
        </div>
      </Section>

      <Section title="Поля">
        <div className="grid gap-5 md:grid-cols-2">
          <Input label="ФИО работника" placeholder="Иванов Иван Иванович" required />
          <Input label="ИНН" defaultValue="12345" error="ИНН должен содержать 10 или 12 цифр" />
          <Select label="Тип стороны" options={[{ value: "org", label: "Организация" }, { value: "ip", label: "ИП" }, { value: "person", label: "Физическое лицо" }]} />
          <Input label="Дата начала" type="date" hint="Можно выбрать будущую дату" />
          <Textarea label="Трудовая функция" placeholder="Опишите обязанности" className="md:col-span-2" />
          <Toggle checked={on} onChange={setOn} label="Испытательный срок" hint="Не более 3 месяцев (ст. 70 ТК РФ)" />
          <label className="flex items-center gap-3 text-[15px]"><Checkbox defaultChecked /> Согласен с условиями</label>
        </div>
      </Section>

      <Section title="Теги и карточки">
        <div className="flex flex-wrap gap-2">
          <Tag tone="coral">Популярное</Tag><Tag tone="blue">Трудовые</Tag><Tag tone="green">Готово</Tag><Tag tone="amber">Черновик</Tag><Tag tone="violet">ИИ</Tag><Tag>Аренда</Tag>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="flex flex-col gap-3 p-5">
            <div className="grid size-11 place-items-center rounded-xl bg-[#fde3df] text-accent"><FileText className="size-5" /></div>
            <h3 className="font-display text-lg font-bold">Трудовой договор</h3>
            <p className="text-sm text-text-2">Бессрочный или срочный, с испытательным сроком.</p>
          </Card>
          <Card className="flex flex-col gap-3 p-5"><Skeleton className="size-11" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /></Card>
          <Card className="flex flex-col items-start gap-3 p-5">
            <p className="text-sm text-text-2">Модалки и тосты</p>
            <Button variant="secondary" size="sm" onClick={() => setModal(true)}>Открыть модалку</Button>
            <Button variant="secondary" size="sm" onClick={() => toast("Документ сохранён", "success")}>Показать тост</Button>
          </Card>
        </div>
      </Section>

      <Section title="Таблица">
        <Table>
          <thead><tr><Th className="w-12"><Checkbox aria-label="Выбрать все" /></Th><Th>Название</Th><Th>Шаблон</Th><Th>Изменён</Th></tr></thead>
          <tbody>
            {[["Трудовой договор с Петровым", "Трудовой договор", "25 ноя 2026"], ["Аренда квартиры на Ленина", "Аренда жилья", "24 ноя 2026"]].map(([a, b, c]) => (
              <tr key={a} className="hover:bg-surface-2/40"><Td><Checkbox aria-label={`Выбрать ${a}`} /></Td><Td className="font-medium">{a}</Td><Td className="text-text-2">{b}</Td><Td className="text-text-2">{c}</Td></tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Modal open={modal} onClose={() => setModal(false)} title="Удалить документ?" footer={<><Button variant="ghost" onClick={() => setModal(false)}>Отмена</Button><Button variant="danger" onClick={() => setModal(false)}>Удалить</Button></>}>
        <p className="text-text-2">Документ «Трудовой договор с Петровым» будет удалён без возможности восстановления.</p>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
