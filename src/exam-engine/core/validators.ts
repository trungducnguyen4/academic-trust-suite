import type { ExamTemplate } from "../domain/types";

export function InstructionBoundaryValidator(template: ExamTemplate, snapshot: any) {
  // Ensure every group in snapshot has instruction when original had instruction
  const problems: string[] = [];
  for (const sec of template.sections) {
    const ss = snapshot.sections.find((s: any) => s.id === sec.id);
    if (!ss) continue;
    for (const g of sec.groups) {
      const gsnap = ss.groups.find((gg: any) => gg.id === g.id);
      if (!gsnap) continue;
      if (g.instruction && !gsnap.instruction) {
        problems.push(`Group ${g.id} lost instruction in snapshot`);
      }
    }
  }
  return problems;
}

export function SequentialDependencyValidator(template: ExamTemplate, snapshot: any) {
  const problems: string[] = [];
  for (const sec of template.sections) {
    const ss = snapshot.sections.find((s: any) => s.id === sec.id);
    if (!ss) continue;
    for (const g of sec.groups) {
      if (g.fixed_sequence) {
        const gsnap = ss.groups.find((gg: any) => gg.id === g.id);
        if (!gsnap) continue;
        const orig = g.questions.map((q) => q.id);
        if (JSON.stringify(orig) !== JSON.stringify(gsnap.question_order)) {
          problems.push(`Group ${g.id} fixed_sequence violated`);
        }
      }
    }
  }
  return problems;
}

export function ReferenceConsistencyValidator(template: ExamTemplate, snapshot: any) {
  const problems: string[] = [];
  // rudimentary: ensure reference_anchor paragraph keys exist in passage content
  for (const sec of template.sections) {
    for (const p of sec.passages) {
      const content = p.content || "";
      // naive paragraph split by double newline
      const paras = content.split(/\n\n+/).map((s) => s.trim());
      const ss = snapshot.sections.find((s: any) => s.id === sec.id);
      if (!ss) continue;
      for (const g of sec.groups) {
        const gsnap = ss.groups.find((gg: any) => gg.id === g.id);
        if (!gsnap) continue;
        for (const q of g.questions) {
          if (q.reference_anchor && q.reference_anchor.paragraph) {
            const paraId = q.reference_anchor.paragraph;
            // check paragraph letter exists (A/B/C) or numeric index
            const found = paras.some((ptext, idx) => {
              const label = String.fromCharCode(65 + idx);
              return label === paraId || String(idx + 1) === String(paraId);
            });
            if (!found) {
              problems.push(`Question ${q.id} references missing paragraph ${paraId}`);
            }
          }
        }
      }
    }
  }
  return problems;
}

export function AudioSegmentAtomicValidator(template: ExamTemplate, snapshot: any) {
  const problems: string[] = [];
  for (const sec of template.sections) {
    const ss = snapshot.sections.find((s: any) => s.id === sec.id);
    if (!ss) continue;
    const finalOrder: string[] = ss.group_order || ss.groups.map((g: any) => g.id);

    // build map of segment -> groups in original template order
    const segMap: Map<string, string[]> = new Map();
    for (const g of sec.groups) {
      if ((g as any).audio_segment_id) {
        const key = String((g as any).audio_segment_id);
        if (!segMap.has(key)) segMap.set(key, []);
        segMap.get(key)!.push(g.id);
      }
    }

    for (const [seg, ids] of segMap.entries()) {
      if (ids.length <= 1) continue;
      // find indices of each id in finalOrder
      const indices = ids.map((id) => finalOrder.indexOf(id));
      if (indices.some((i) => i === -1)) {
        problems.push(`Audio segment ${seg} groups missing in final order for section ${sec.id}`);
        continue;
      }
      const min = Math.min(...indices);
      const max = Math.max(...indices);
      if (max - min + 1 !== ids.length) {
        problems.push(`Audio segment ${seg} groups are not contiguous in section ${sec.id}`);
        continue;
      }
      // check relative order preserved
      const slice = finalOrder.slice(min, max + 1);
      if (JSON.stringify(slice) !== JSON.stringify(ids)) {
        problems.push(`Audio segment ${seg} group relative order violated in section ${sec.id}`);
      }
    }
  }
  return problems;
}
