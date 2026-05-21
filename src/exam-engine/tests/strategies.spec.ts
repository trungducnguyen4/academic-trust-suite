import { describe, it, expect } from "vitest";
import "../strategies"; // register built-in strategies
import { generateExam } from "../core/generator";

describe("Strategy behaviors", () => {
  it("ordered-reasoning strategy preserves question order", () => {
    const template = {
      id: "t-ord",
      sections: [
        {
          id: "sec1",
          groups: [
            {
              id: "g-ord",
              shuffle_strategy: "ordered-reasoning",
              questions: [
                { id: "q1", content: "a" },
                { id: "q2", content: "b" },
                { id: "q3", content: "c" },
              ],
            },
          ],
        },
      ],
    } as any;

    const snap = generateExam(template, 42);
    const qOrder = snap.sections[0].groups[0].question_order;
    expect(qOrder).toEqual(["q1", "q2", "q3"]);
  });

  it("matching-heading strategy keeps answer permutations identity", () => {
    const template = {
      id: "t-match",
      sections: [
        {
          id: "s1",
          groups: [
            {
              id: "gmatch",
              shuffle_strategy: "matching-heading",
              questions: [
                { id: "q1", answers: [{ id: "a1" }, { id: "a2" }, { id: "a3" }] },
              ],
            },
          ],
        },
      ],
    } as any;

    const snap = generateExam(template, 99);
    const ap = snap.sections[0].groups[0].questions[0].answer_permutation;
    expect(ap).toEqual([0, 1, 2]);
  });
});
