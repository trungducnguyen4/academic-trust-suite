import { describe, it, expect } from "vitest";
import "../strategies";
import { generateExam } from "../core/generator";
import { AudioSegmentAtomicValidator } from "../core/validators";

describe("Listening validators", () => {
  it("audio segment atomic validator finds no problems for generated snapshot", () => {
    const template = {
      id: "t-listen-2",
      sections: [
        {
          id: "sec1",
          shuffle_policy: "group_unit",
          groups: [
            { id: "g1", audio_segment_id: "segA", questions: [{ id: "q1" }] },
            { id: "g2", audio_segment_id: "segA", questions: [{ id: "q2" }] },
            { id: "g3", audio_segment_id: "segB", questions: [{ id: "q3" }] },
            { id: "g4", audio_segment_id: "segB", questions: [{ id: "q4" }] },
          ],
        },
      ],
    } as any;

    const snap = generateExam(template, 4242);
    const problems = AudioSegmentAtomicValidator(template as any, snap);
    expect(problems.length).toBe(0);
  });
});
