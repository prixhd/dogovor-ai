import { describe, expect, it } from "vitest";
import { wordDiff } from "./diff";
import { applyOp } from "./edits";

describe("wordDiff", () => {
  it("marks changed words", () => {
    const d = wordDiff("испытание сроком 1 месяц", "испытание сроком 3 месяца");
    expect(d.filter((p) => p.type === "del").map((p) => p.text.trim()).join(" ")).toContain("1");
    expect(d.filter((p) => p.type === "add").map((p) => p.text.trim()).join(" ")).toContain("3");
    expect(d.map((p) => (p.type === "del" ? "" : p.text)).join("")).toBe("испытание сроком 3 месяца");
  });
});

describe("applyOp", () => {
  it("applies replace, insert and delete immutably", () => {
    let e = applyOp({}, { op: "replace", id: "a", text: "A2" });
    e = applyOp(e, { op: "insert", id: "ai-1", after: "a", text: "new" });
    e = applyOp(e, { op: "replace", id: "ai-1", text: "new2" });
    e = applyOp(e, { op: "delete", id: "b" });
    expect(e.replaced).toEqual({ a: "A2" });
    expect(e.inserted).toEqual([{ id: "ai-1", after: "a", style: "clause", text: "new2" }]);
    expect(e.deleted).toEqual(["b"]);
  });
  it("deleting an inserted block removes it", () => {
    let e = applyOp({}, { op: "insert", id: "ai-1", after: "a", text: "x" });
    e = applyOp(e, { op: "delete", id: "ai-1" });
    expect(e.inserted).toEqual([]);
    expect(e.deleted ?? []).toEqual([]);
  });
});
