/** Party card schema (keys match template `bind` and API whitelist). */

export type PartyKind = "org" | "ip" | "person";
export type Party = { id: string; kind: PartyKind; title: string; data: Record<string, string>; createdAt: string; updatedAt: string };

type PartyField = { key: string; label: string; placeholder?: string; type?: "inn" | "ogrn" | "bik" | "account" | "phone" | "email" | "date"; sensitive?: boolean; wide?: boolean };

export const kindLabels: Record<PartyKind, string> = { org: "Организация", ip: "ИП", person: "Физическое лицо" };

const bank: PartyField[] = [
  { key: "bank", label: "Банк", placeholder: "ПАО Сбербанк", wide: true },
  { key: "bik", label: "БИК", type: "bik", placeholder: "044525225" },
  { key: "account", label: "Расчётный счёт", type: "account" },
  { key: "corr_account", label: "Корр. счёт", type: "account" },
];
const contacts: PartyField[] = [
  { key: "phone", label: "Телефон", type: "phone", placeholder: "+7 999 123-45-67" },
  { key: "email", label: "Почта", type: "email" },
];

export const partySchema: Record<PartyKind, PartyField[]> = {
  org: [
    { key: "name", label: "Полное наименование", placeholder: "Общество с ограниченной ответственностью «Ромашка»", wide: true },
    { key: "short_name", label: "Краткое наименование", placeholder: "ООО «Ромашка»" },
    { key: "inn", label: "ИНН", type: "inn" },
    { key: "kpp", label: "КПП" },
    { key: "ogrn", label: "ОГРН", type: "ogrn" },
    { key: "address", label: "Юридический адрес", wide: true },
    { key: "signer_name", label: "ФИО подписанта", placeholder: "Иванов Иван Иванович" },
    { key: "signer_position", label: "Должность подписанта", placeholder: "Генеральный директор" },
    { key: "signer_basis", label: "Действует на основании", placeholder: "Устава" },
    ...bank,
    ...contacts,
  ],
  ip: [
    { key: "name", label: "ФИО предпринимателя", placeholder: "ИП Сидоров Сидор Сидорович", wide: true },
    { key: "inn", label: "ИНН", type: "inn" },
    { key: "ogrn", label: "ОГРНИП", type: "ogrn" },
    { key: "address", label: "Адрес", wide: true },
    ...bank,
    ...contacts,
  ],
  person: [
    { key: "name", label: "ФИО", placeholder: "Петров Пётр Петрович", wide: true },
    { key: "birth_date", label: "Дата рождения", type: "date" },
    { key: "inn", label: "ИНН (если есть)", type: "inn" },
    { key: "passport", label: "Паспорт: серия и номер", placeholder: "4510 123456", sensitive: true },
    { key: "passport_issued", label: "Кем и когда выдан", sensitive: true, wide: true },
    { key: "address", label: "Адрес регистрации", wide: true, sensitive: true },
    ...contacts,
  ],
};

/** Card value for a template `bind` key, with sensible fallbacks per kind. */
export function partyValue(p: Party, bind: string): string | undefined {
  const v = p.data[bind];
  if (v) return v;
  switch (bind) {
    case "signer_name":
      return p.kind === "org" ? undefined : p.data.name;
    case "signer_position":
      return p.kind === "ip" ? "Индивидуальный предприниматель" : undefined;
    case "signer_basis":
      return p.kind === "ip" ? `листа записи ЕГРИП${p.data.ogrn ? `, ОГРНИП ${p.data.ogrn}` : ""}` : undefined;
    case "name":
      return p.data.short_name;
  }
  return undefined;
}
