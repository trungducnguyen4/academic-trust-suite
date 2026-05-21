import { describe, it, expect } from "vitest";
import "../strategies";
import { generateExam } from "../core/generator";

describe("Listening audio-segment atomic moves", () => {
  it("moves groups atomically by audio_segment_id when section.shuffle_policy is group_unit", () => {
    const template = {
      id: "t-listen",
      sections: [
        {
          id: "sec1",
          shuffle_policy: "group_unit",
          groups: [
            { id: "g1", audio_segment_id: "segA", questions: [{ id: "q1" }] },
            { id: "g2", audio_segment_id: "segA", questions: [{ id: "q2" }] },
            { id: "g3", audio_segment_id: "segB", questions: [{ id: "q3" }] },
            { id: "g4", audio_segment_id: "segB", questions: [{ id: "q4" }] },
            { id: "g5", audio_segment_id: "segC", questions: [{ id: "q5" }] },
          ],
        },
      ],
    } as any;

    const snap = generateExam(template, 2023);
    const order = snap.sections[0].group_order;
    // groups belonging to same segment should remain adjacent and in original relative order
    function findRun(arr: string[], ids: string[]) {
      for (let i = 0; i <= arr.length - ids.length; i++) {
        let ok = true;
        for (let j = 0; j < ids.length; j++) if (arr[i + j] !== ids[j]) { ok = false; break; }
        if (ok) return true;
      }
      return false;
    }

    expect(findRun(order, ["g1", "g2"]) ).toBe(true);
    expect(findRun(order, ["g3", "g4"]) ).toBe(true);
    expect(order.includes("g5")).toBe(true);
  });
});
