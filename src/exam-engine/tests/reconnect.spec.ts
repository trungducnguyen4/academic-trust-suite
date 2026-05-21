import { describe, it, expect } from "vitest";
import { generateExam } from "../core/generator";

const template = {
  id: "template-3",
  sections: [
    {
      id: "s1",
      passages: [{ id: "p1", content: "A\n\nB" }],
      groups: [
        {
          id: "g1",
          questions: [
            { id: "q1", content: "Q1", answers: [{ id: "a1", text: "A" }] },
            { id: "q2", content: "Q2", answers: [{ id: "a2", text: "B" }] },
          ],
        },
      ],
    },
  ],
};

describe("Reconnect stability", () => {
  it("returns same snapshot on repeated generate with same seed", () => {
    const s1 = generateExam(template as any, "student-xyz:seed-1");
    const s2 = generateExam(template as any, "student-xyz:seed-1");
    expect(s1.snapshot_hash).toEqual(s2.snapshot_hash);
  });
});
