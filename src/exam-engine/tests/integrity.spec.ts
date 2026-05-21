import { describe, it, expect } from "vitest";
import { generateExam } from "../core/generator";
import { InstructionBoundaryValidator, SequentialDependencyValidator } from "../core/validators";

const template = {
  id: "template-2",
  sections: [
    {
      id: "sec-1",
      title: "Sec",
      passages: [{ id: "p1", content: "Para A\n\nPara B" }],
      groups: [
        {
          id: "g1",
          instruction: "Do in order",
          fixed_sequence: true,
          questions: [
            { id: "q1", content: "Q1" },
            { id: "q2", content: "Q2" },
          ],
        },
      ],
    },
  ],
};

describe("Integrity validators", () => {
  it("respects fixed_sequence and retains instructions", () => {
    const snap = generateExam(template as any, 999);
    const problems1 = InstructionBoundaryValidator(template as any, snap);
    const problems2 = SequentialDependencyValidator(template as any, snap);
    expect(problems1.length).toBe(0);
    expect(problems2.length).toBe(0);
  });
});
