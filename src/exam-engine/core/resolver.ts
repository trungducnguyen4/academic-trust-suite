import type { RenderingContract } from "./contract";

/**
 * resolveSnapshot hydrates a snapshot (reference-only snapshot) into a renderable payload.
 * contentStore should provide versioned content by id or version_id.
 * This function is pure and does not perform IO.
 */
export function resolveSnapshot(snapshot: any, contentStore: any) {
  // Build structural
  const structural = {
    engine_version: snapshot.engine_version,
    snapshot_hash: snapshot.snapshot_hash,
    exam_instance_id: snapshot.exam_instance_id,
    seed: snapshot.seed,
    generated_at: snapshot.generated_at ?? new Date().toISOString(),
  };

  // Build ordering layer
  const section_order = snapshot.section_order || snapshot.sections.map((s: any) => s.id);
  const group_order: { [k: string]: string[] } = {};
  const question_order: { [k: string]: string[] } = {};
  const answer_permutations: { [k: string]: number[] } = {};
  const reference_bindings: any[] = [];

  for (const sec of snapshot.sections) {
    group_order[sec.id] = sec.groups.map((g: any) => g.id);
    for (const g of sec.groups) {
      question_order[g.id] = g.question_order || g.questions.map((q: any) => q.id);
      for (const q of g.questions) {
        if (q.answer_permutation) answer_permutations[q.id] = q.answer_permutation;
        if (q.reference_binding) reference_bindings.push({ question_id: q.id, ...q.reference_binding });
      }
    }
  }

  const ordering = { section_order, group_order, question_order, answer_permutations };

  const contract: RenderingContract = {
    structural: structural as any,
    ordering,
    reference_bindings,
  };

  // Resolve data: collect required content from contentStore
  const data: any = { passages: {}, groups: {}, questions: {}, optionSets: {} };
  for (const sec of snapshot.sections) {
    for (const p of sec.passages || []) {
      const key = p.version_id ?? p.id;
      data.passages[p.id] = contentStore.passages?.[key] ?? p;
    }
    for (const g of sec.groups) {
      const key = g.version_id ?? g.id;
      data.groups[g.id] = contentStore.groups?.[key] ?? g;
      for (const q of g.questions) {
        const qkey = q.version_id ?? q.id;
        const qcontent = contentStore.questions?.[qkey] ?? q;
        // apply answer permutation to resolve answer ordering
        let answers = qcontent.answers ?? [];
        if (q.answer_permutation && Array.isArray(q.answer_permutation) && answers.length) {
          answers = q.answer_permutation.map((idx: number) => answers[idx]);
        }
        data.questions[q.id] = { ...qcontent, answers };
        if (qcontent.optionSetId) {
          const os = contentStore.optionSets?.[qcontent.optionSetId];
          if (os) data.optionSets[qcontent.optionSetId] = os;
        }
      }
    }
  }

  return { contract, data };
}
