import { describe, it, expect } from "vitest";
import { generateExam } from "../core/generator";

const template = {
  id: "template-1",
  sections: [
    {
      id: "sec-1",
      title: "Section 1",
      passages: [
        { id: "pass-1", content: "Para A\n\nPara B" },
      ],
      groups: [
        {
          id: "g-1",
          title: "Group 1",
          fixed_sequence: false,
          questions: [
            { id: "q-1", content: "Q1", answers: [{ id: "a1", text: "A" }, { id: "a2", text: "B" }] },
            { id: "q-2", content: "Q2", answers: [{ id: "a3", text: "C" }, { id: "a4", text: "D" }] },
            { id: "q-3", content: "Q3", answers: [{ id: "a5", text: "E" }, { id: "a6", text: "F" }] },
          ],
        },
      ],
    },
  ],
};

describe("Deterministic generation", () => {
  it("produces identical snapshot for same seed", () => {
    const s1 = generateExam(template as any, 12345);
    const s2 = generateExam(template as any, 12345);
    expect(s1.snapshot_hash).toEqual(s2.snapshot_hash);
    expect(JSON.stringify(s1)).toEqual(JSON.stringify(s2));
  });

  it("different seed changes snapshot", () => {
    const s1 = generateExam(template as any, 111);
    const s2 = generateExam(template as any, 222);
    expect(s1.snapshot_hash).not.toEqual(s2.snapshot_hash);
  });
});
