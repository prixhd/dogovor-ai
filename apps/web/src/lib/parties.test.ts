import { describe, expect, it } from "vitest";
import { partyValue, type Party } from "./parties";

const base = { id: "1", title: "t", createdAt: "", updatedAt: "" };

describe("partyValue", () => {
  it("uses the person's name as signer", () => {
    const p: Party = { ...base, kind: "person", data: { name: "Петров П.П." } };
    expect(partyValue(p, "signer_name")).toBe("Петров П.П.");
  });
  it("fills IP position and basis", () => {
    const p: Party = { ...base, kind: "ip", data: { name: "ИП Сидоров", ogrn: "304500116000157" } };
    expect(partyValue(p, "signer_position")).toBe("Индивидуальный предприниматель");
    expect(partyValue(p, "signer_basis")).toContain("304500116000157");
  });
  it("does not invent an org signer", () => {
    const p: Party = { ...base, kind: "org", data: { name: "ООО" } };
    expect(partyValue(p, "signer_name")).toBeUndefined();
  });
});
