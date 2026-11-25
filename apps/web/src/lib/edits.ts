import type { Edits } from "./template";

export type EditOp = { op: "replace" | "insert" | "delete"; id: string; after?: string; text?: string; reason?: string };

/** Applies an accepted AI operation to the document edits (pure). */
export function applyOp(e: Edits, op: EditOp): Edits {
  const inserted = [...(e.inserted ?? [])];
  const replaced = { ...(e.replaced ?? {}) };
  const deleted = [...(e.deleted ?? [])];
  const insIdx = inserted.findIndex((b) => b.id === op.id);
  switch (op.op) {
    case "replace":
      if (insIdx >= 0) inserted[insIdx] = { ...inserted[insIdx], text: op.text ?? "" };
      else replaced[op.id] = op.text ?? "";
      break;
    case "insert":
      inserted.push({ id: op.id, after: op.after ?? "", style: "clause", text: op.text ?? "" });
      break;
    case "delete":
      if (insIdx >= 0) inserted.splice(insIdx, 1);
      else if (!deleted.includes(op.id)) deleted.push(op.id);
      break;
  }
  return { replaced, inserted, deleted };
}
