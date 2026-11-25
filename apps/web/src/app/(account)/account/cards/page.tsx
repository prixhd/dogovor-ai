"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, IdCard, Pencil, Plus, Store, Trash2, User } from "lucide-react";
import { PageHead } from "@/components/account/AccountShell";
import { PartyForm } from "@/components/parties/PartyForm";
import { Button } from "@/components/ui/Button";
import { Skeleton, Tag } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { kindLabels, type Party } from "@/lib/parties";

const icons = { org: Building2, ip: Store, person: User };
const tones = { org: "blue", ip: "violet", person: "green" } as const;

export default function CardsPage() {
  const [parties, setParties] = useState<Party[] | null>(null);
  const [editing, setEditing] = useState<Party | null | "new">(null);
  const [confirm, setConfirm] = useState<Party | null>(null);
  const toast = useToast();
  const load = useCallback(async () => {
    try {
      setParties((await api<{ parties: Party[] }>("/parties")).parties);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "error");
      setParties([]);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async (p: Party) => {
    setConfirm(null);
    try {
      await api(`/parties/${p.id}`, { method: "DELETE" });
      toast("Карточка удалена", "success");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  };

  return (
    <>
      <PageHead crumbs={["Кабинет", "Карточки сторон"]} title="Карточки сторон" actions={<Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" />Новая карточка</Button>} />
      <div className="px-5 py-6 sm:px-8">
        <p className="mb-6 max-w-2xl text-text-2">Сохраните реквизиты своей компании, ИП или людей, с которыми часто заключаете договоры. В конструкторе в режиме «По карточке» они подставятся в нужные поля.</p>
        {parties === null ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        ) : parties.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line px-6 py-20 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#6fd6a8] to-[#2fa67a] text-white shadow-lift"><IdCard className="size-7" /></span>
            <h2 className="font-display text-2xl font-bold">Карточек пока нет</h2>
            <p className="max-w-md text-text-2">Добавьте реквизиты один раз и больше не вводите их вручную.</p>
            <Button onClick={() => setEditing("new")}><Plus className="size-4" />Добавить карточку</Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {parties.map((p) => {
              const Icon = icons[p.kind];
              return (
                <article key={p.id} className="group flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-lift">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2"><Icon className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold">{p.title}</h2>
                      <Tag tone={tones[p.kind]} className="mt-1">{kindLabels[p.kind]}</Tag>
                    </div>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    {p.data.inn && (<><dt className="text-text-2">ИНН</dt><dd className="tabular-nums">{p.data.inn}</dd></>)}
                    {p.data.ogrn && (<><dt className="text-text-2">{p.kind === "ip" ? "ОГРНИП" : "ОГРН"}</dt><dd className="tabular-nums">{p.data.ogrn}</dd></>)}
                    {p.data.signer_name && (<><dt className="text-text-2">Подписант</dt><dd className="truncate">{p.data.signer_name}</dd></>)}
                    {p.data.address && (<><dt className="text-text-2">Адрес</dt><dd className="truncate">{p.data.address}</dd></>)}
                  </dl>
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(p)}><Pencil className="size-4" />Изменить</Button>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm(p)} aria-label={`Удалить карточку ${p.title}`}><Trash2 className="size-4" /></Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Новая карточка" : "Изменить карточку"} className="w-[min(720px,calc(100vw-32px))]">
        {editing !== null && (
          <PartyForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); toast("Карточка сохранена", "success"); load(); }} />
        )}
      </Modal>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Удалить карточку?" footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Отмена</Button><Button variant="danger" onClick={() => confirm && remove(confirm)}>Удалить</Button></>}>
        <p className="text-text-2">Карточка «{confirm?.title}» будет удалена. Уже созданные документы не изменятся.</p>
      </Modal>
    </>
  );
}
