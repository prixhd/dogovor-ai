"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Copy, FilePlus2, FileText, LayoutGrid, List, MoreHorizontal, Search, Trash2, ExternalLink } from "lucide-react";
import { PageHead } from "@/components/account/AccountShell";
import { Button, LinkButton } from "@/components/ui/Button";
import { Skeleton, Tag } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { categories } from "@/lib/catalog";
import { cn } from "@/lib/cn";

type Doc = { id: string; title: string; templateSlug: string; templateTitle: string; category: string; createdAt: string; updatedAt: string };

const fmt = new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const folderTints: Record<string, string> = { labor: "from-[#7d95ff] to-[#4f6bff]", services: "from-[#b49cff] to-[#7b5cf0]", realty: "from-[#6fd6a8] to-[#2fa67a]", sale: "from-[#ffc96b] to-[#f0a020]", finance: "from-[#ff9d93] to-[#ef5b50]", power: "from-[#a3a8b3] to-[#6b6f78]" };

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [q, setQ] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setDocs((await api<{ documents: Doc[] }>("/documents")).documents);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const list = useMemo(() => {
    const xs = (docs ?? []).filter((d) => !q || `${d.title} ${d.templateTitle}`.toLowerCase().includes(q.toLowerCase()));
    return xs.sort((a, b) => (sortAsc ? 1 : -1) * a.updatedAt.localeCompare(b.updatedAt));
  }, [docs, q, sortAsc]);

  const duplicate = async (id: string) => {
    setMenu(null);
    try {
      await api(`/documents/${id}/duplicate`, { method: "POST" });
      toast("Копия создана", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };
  const remove = async (ids: string[]) => {
    setConfirm(null);
    const results = await Promise.allSettled(ids.map((id) => api(`/documents/${id}`, { method: "DELETE" })));
    const failed = results.filter((r) => r.status === "rejected").length;
    toast(failed ? `Не удалось удалить: ${failed}` : ids.length > 1 ? `Удалено документов: ${ids.length}` : "Документ удалён", failed ? "error" : "success");
    setSelected(new Set());
    load();
  };
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allChecked = list.length > 0 && list.every((d) => selected.has(d.id));

  return (
    <>
      <PageHead
        crumbs={["Кабинет", "Документы"]}
        title="Документы"
        actions={
          <>
            <div className="flex items-center gap-1 rounded-xl bg-surface-2/70 p-1" role="group" aria-label="Вид">
              {([["list", List, "Список"], ["grid", LayoutGrid, "Сетка"]] as const).map(([v, Icon, l]) => (
                <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cn("flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium", view === v ? "bg-surface shadow-soft" : "text-text-2 hover:text-text")}><Icon className="size-4" />{l}</button>
              ))}
            </div>
            <LinkButton href="/catalog" size="sm"><FilePlus2 className="size-4" />Создать</LinkButton>
          </>
        }
      />
      <div className="flex flex-col gap-8 px-5 py-6 sm:px-8">
        {error && <p role="alert" className="rounded-xl bg-[#fde3df] px-4 py-3 text-sm text-[#b8392f]">{error} <button onClick={load} className="underline">Повторить</button></p>}
        {docs === null && !error ? (
          <div className="flex flex-col gap-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div><Skeleton className="h-72 rounded-2xl" /></div>
        ) : docs && docs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#7d95ff] to-[#4f6bff] text-white shadow-lift"><FileText className="size-7" /></span>
            <h2 className="font-display text-2xl font-bold">Здесь появятся ваши документы</h2>
            <p className="max-w-md text-text-2">Создайте первый документ: заполните анкету, и он сохранится здесь. Можно будет открыть, скопировать или скачать снова.</p>
            <LinkButton href="/catalog">Выбрать документ</LinkButton>
          </div>
        ) : (
          <>
            <section aria-labelledby="recent">
              <h2 id="recent" className="mb-4 text-[15px] font-semibold">Недавние <span className="text-text-2">{Math.min(4, docs!.length)}</span></h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {docs!.slice(0, 4).map((d) => (
                  <Link key={d.id} href={`/c/${d.templateSlug}?doc=${d.id}`} className="group rounded-2xl border border-line bg-surface p-2 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="grid h-32 place-items-center rounded-xl bg-surface-2/70">
                      <div className={cn("relative h-16 w-20 rounded-lg bg-gradient-to-b shadow-soft transition-transform group-hover:-translate-y-1", folderTints[d.category] ?? folderTints.power)}>
                        <span className="absolute -top-2 left-0 h-4 w-9 rounded-t-md bg-inherit opacity-90" />
                        <span className="absolute inset-x-2 -top-1 h-10 rounded bg-white/80" />
                        <span className={cn("absolute inset-0 top-3 rounded-lg bg-gradient-to-b", folderTints[d.category] ?? folderTints.power)} />
                      </div>
                    </div>
                    <div className="px-2 pb-2 pt-3 text-center">
                      <p className="truncate font-semibold">{d.title}</p>
                      <p className="mt-0.5 text-xs text-text-2">{d.templateTitle} · {fmt.format(new Date(d.updatedAt))}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="all" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="all" className="text-[15px] font-semibold">Все документы <span className="text-text-2">{docs!.length}</span></h2>
                <div className="ml-auto flex h-10 items-center gap-2 rounded-xl border border-line px-3 focus-within:border-ai">
                  <Search className="size-4 text-text-2" />
                  <input aria-label="Поиск по документам" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" className="w-40 bg-transparent text-sm outline-none" />
                </div>
                {selected.size > 0 && <Button size="sm" variant="danger" onClick={() => setConfirm([...selected])}><Trash2 className="size-4" />Удалить ({selected.size})</Button>}
              </div>
              {view === "list" ? (
                <Table>
                  <thead>
                    <tr>
                      <Th className="w-12"><Checkbox aria-label="Выбрать все" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(list.map((d) => d.id)))} /></Th>
                      <Th>Название</Th>
                      <Th className="hidden md:table-cell">Шаблон</Th>
                      <Th><button onClick={() => setSortAsc(!sortAsc)} className="flex items-center gap-1 hover:text-text">Изменён <ArrowUpDown className="size-3.5" /></button></Th>
                      <Th className="w-14"><span className="sr-only">Действия</span></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((d) => (
                      <tr key={d.id} className={cn("transition-colors hover:bg-surface-2/40", selected.has(d.id) && "bg-surface-2/40")}>
                        <Td><Checkbox aria-label={`Выбрать «${d.title}»`} checked={selected.has(d.id)} onChange={() => toggle(d.id)} /></Td>
                        <Td><Link href={`/c/${d.templateSlug}?doc=${d.id}`} className="font-medium hover:text-accent">{d.title}</Link></Td>
                        <Td className="hidden md:table-cell">{categories[d.category] ? <Tag tone={categories[d.category].tone}>{d.templateTitle}</Tag> : d.templateTitle}</Td>
                        <Td className="whitespace-nowrap text-text-2">{fmt.format(new Date(d.updatedAt))}</Td>
                        <Td className="relative">
                          <button onClick={() => setMenu(menu === d.id ? null : d.id)} aria-label={`Действия с «${d.title}»`} aria-expanded={menu === d.id} className="grid size-9 place-items-center rounded-full hover:bg-surface-2"><MoreHorizontal className="size-4" /></button>
                          {menu === d.id && (
                            <div className="absolute right-4 top-12 z-20 w-48 animate-rise rounded-2xl border border-line bg-surface p-1.5 shadow-lift" onMouseLeave={() => setMenu(null)}>
                              <Link href={`/c/${d.templateSlug}?doc=${d.id}`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"><ExternalLink className="size-4" />Открыть</Link>
                              <button onClick={() => duplicate(d.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"><Copy className="size-4" />Дублировать</button>
                              <button onClick={() => { setMenu(null); setConfirm([d.id]); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger hover:bg-surface-2"><Trash2 className="size-4" />Удалить</button>
                            </div>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((d) => (
                    <div key={d.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/c/${d.templateSlug}?doc=${d.id}`} className="font-semibold hover:text-accent">{d.title}</Link>
                        <Checkbox aria-label={`Выбрать «${d.title}»`} checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                      </div>
                      <p className="text-sm text-text-2">{d.templateTitle} · {fmt.format(new Date(d.updatedAt))}</p>
                      <div className="mt-auto flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => duplicate(d.id)}><Copy className="size-4" />Копия</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirm([d.id])} className="text-danger"><Trash2 className="size-4" />Удалить</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {list.length === 0 && <p className="py-10 text-center text-text-2">Ничего не найдено по запросу «{q}»</p>}
            </section>
          </>
        )}
      </div>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm && confirm.length > 1 ? `Удалить документы (${confirm.length})?` : "Удалить документ?"}
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Отмена</Button><Button variant="danger" onClick={() => confirm && remove(confirm)}>Удалить</Button></>}
      >
        <p className="text-text-2">Удаление нельзя отменить. Файлы, которые вы уже скачали, останутся у вас.</p>
      </Modal>
    </>
  );
}
