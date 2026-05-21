import { createHash } from "crypto";
import { canonicalStringify, hashObject } from "./canonical";
import { makeXoroshiro128Plus, seedFromNumbers } from "./prng";
import { shuffleWithRng } from "./shuffle";
import type { ExamTemplate, ExamSection, QuestionGroup, Question } from "../domain/types";
import { DefaultFlexible, StrictNoShuffle } from "../strategies/ShuffleStrategy";
import { strategyRegistry } from "../core/strategyRegistry";

export interface Snapshot {
  engine_version: string;
  seed: number | string;
  template_id?: string;
  sections: any[];
  section_order: string[];
  snapshot_hash?: string;
}

// Use canonical hashing for stable checksums across runtimes
function hashJson(obj: any) {
  return hashObject(obj);
}

function chooseStrategy(group: QuestionGroup) {
  // fixed sequence always wins
  if (group.fixed_sequence) return StrictNoShuffle;
  // resolve via registry if provided
  if (group.shuffle_strategy) {
    const resolved = strategyRegistry.resolve(group.shuffle_strategy);
    if (resolved) return resolved as any;
  }
  // legacy values
  if (group.shuffle_strategy === "none") return StrictNoShuffle;
  if (group.shuffle_strategy === "flexible") return DefaultFlexible;
  return DefaultFlexible;
}

export function generateExam(template: ExamTemplate, seedInput: number | string): Snapshot {
  // pure-function: deterministic snapshot generation
  const seedNum = typeof seedInput === "number" ? seedInput : hashStringToNumber(seedInput);
  const seed = seedFromNumbers(seedNum);
  const rng = makeXoroshiro128Plus(seed);

  const snapshot: Snapshot = {
    engine_version: "1.0.0",
    seed: seedInput,
    template_id: template.id,
    sections: [],
    section_order: [],
  };

  // Section ordering: for now preserve template order but record it.
  const sectionIds = template.sections.map((s) => s.id);
  snapshot.section_order = sectionIds.slice();

  for (const sec of template.sections) {
    const secSeed = seedFromNumbers(seedNum, hashStringToNumber(sec.id));
    const secRng = makeXoroshiro128Plus(secSeed);
    const sectionSnapshot: any = {
      id: sec.id,
      version_id: sec.version_id,
      title: sec.title,
      groups: [],
      group_order: [],
    };

    // For each group, decide strategy and shuffle question order or answers
    // But we first build group snapshots; group-level (atomic) shuffling will be applied after this loop
    for (const g of sec.groups) {
      const strat = chooseStrategy(g);
      const gSeed = seedFromNumbers(seedNum, hashStringToNumber(sec.id), hashStringToNumber(g.id));
      const gRng = makeXoroshiro128Plus(gSeed);

      let questionOrder = g.questions.map((q) => q.id);
      if (strat.canShuffleQuestions()) {
        const { result, permutation } = shuffleWithRng(questionOrder, gRng as any);
        questionOrder = result as string[];
      }

      const groupSnap: any = {
        id: g.id,
        version_id: g.version_id,
        title: g.title,
        instruction: g.instruction,
        group_type: g.group_type,
        question_order: questionOrder,
        questions: [],
      };

      // For each question produce answer permutation and reference binding
      for (const q of g.questions) {
        const qSeed = seedFromNumbers(seedNum, hashStringToNumber(q.id));
        const qRng = makeXoroshiro128Plus(qSeed);
        let answer_perm: number[] = [];
        if (q.answers && q.answers.length > 0) {
          const indexes = q.answers.map((_, i) => i);
          if (strat.canShuffleAnswers()) {
            const { result, permutation } = shuffleWithRng(indexes, qRng as any);
            answer_perm = permutation;
          } else {
            answer_perm = indexes;
          }
        }

        const qSnap = {
          id: q.id,
          version_id: q.version_id,
          answer_permutation: answer_perm,
          reference_binding: q.reference_anchor ?? null,
        };
        groupSnap.questions.push(qSnap);
      }

      sectionSnapshot.groups.push(groupSnap);
    }

    // GROUP-LEVEL (atomic) SHUFFLE
    // Determine atomic units: groups that require atomic moves (e.g., listening-timecode bound to an audio segment)
    // Groups that share the same `audio_segment_id` will move together as one unit when strategy.shuffleAsAtomicUnit() === true
    const groups = sectionSnapshot.groups;
    // Build units keyed by atomic key
    const unitsMap: Map<string, any[]> = new Map();
    const atomicKeys: string[] = [];
    for (const g of groups) {
      const origGroup = sec.groups.find((x: any) => x.id === g.id) as any;
      const strat = chooseStrategy(origGroup);
      // If group references an audio segment, treat that segment as the atomic key
      // so all groups tied to the same audio segment move together.
      const atomicKey = origGroup.audio_segment_id ? `audio:${String(origGroup.audio_segment_id)}` : (strat.shuffleAsAtomicUnit() && origGroup.audio_segment_id ? String(origGroup.audio_segment_id) : g.id);
      if (!unitsMap.has(atomicKey)) {
        unitsMap.set(atomicKey, []);
        atomicKeys.push(atomicKey);
      }
      unitsMap.get(atomicKey)!.push(g);
    }

    // Decide whether to shuffle atomic units: if section explicitly allows, or any unit is atomic
    const shouldShuffleUnits = (sec.shuffle_policy === "group_unit") || atomicKeys.some((k) => unitsMap.get(k)!.length > 1);
    let finalGroupOrder: string[] = [];
    if (shouldShuffleUnits) {
      // shuffle the order of atomic keys
      const { result: shuffledKeys } = shuffleWithRng(atomicKeys.slice(), secRng as any);
      for (const key of shuffledKeys) {
        const unit = unitsMap.get(key)!;
        for (const g of unit) finalGroupOrder.push(g.id);
      }
    } else {
      // preserve order from template
      finalGroupOrder = sec.groups.map((g: any) => g.id);
    }

    sectionSnapshot.group_order = finalGroupOrder;
    snapshot.sections.push(sectionSnapshot);
  }

  snapshot.snapshot_hash = hashJson(snapshot);
  return snapshot;
}

function hashStringToNumber(s: string) {
  // simple stable 32-bit hash
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
