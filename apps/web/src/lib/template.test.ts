import { describe, expect, it } from "vitest";
import { evalCond, stepProgress, type Step } from "./template";

describe("evalCond mirrors the Go grammar", () => {
  const d = { probation: true, kind: "remote", empty: "", n: 3, off: false };
  const cases: [string, boolean][] = [
    ["", true],
    ["probation", true],
    ["!probation", false],
    ["off", false],
    ["!off", true],
    ["missing", false],
    ["empty", false],
    ["kind == remote", true],
    ["kind != remote", false],
    ["kind == 'office'", false],
    ["n == 3", true],
    ["probation && kind == remote", true],
    ["off || kind == remote", true],
    ["off && probation", false],
  ];
  it.each(cases)("%s → %s", (expr, want) => expect(evalCond(expr, d)).toBe(want));
});

describe("stepProgress", () => {
  const step: Step = {
    id: "s",
    title: "S",
    fields: [
      { id: "a", label: "A", type: "text", required: true },
      { id: "b", label: "B", type: "text", required: true, showIf: "flag" },
    ],
  };
  it("ignores hidden required fields", () => {
    expect(stepProgress(step, { a: "x" })).toBe(1);
    expect(stepProgress(step, { a: "x", flag: true })).toBe(0.5);
  });
});
