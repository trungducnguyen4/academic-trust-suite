// Frozen Rendering Contract definitions

export interface StructuralLayer {
  engine_version: string;
  snapshot_hash: string;
  exam_instance_id?: string;
  seed: string | number;
  generated_at: string; // ISO
}

export interface OrderingLayer {
  section_order: string[]; // list of section ids in render order
  group_order: { [sectionId: string]: string[] }; // groups per section
  question_order: { [groupId: string]: string[] }; // questions per group
  answer_permutations: { [questionId: string]: number[] }; // permutation arrays
}

export interface ReferenceBinding {
  question_id: string;
  passage_id?: string;
  anchor: {
    paragraph?: string;
    offset_start?: number;
    offset_end?: number;
    timecode_start?: number;
    timecode_end?: number;
  };
}

export interface RenderingContract {
  structural: StructuralLayer;
  ordering: OrderingLayer;
  reference_bindings: ReferenceBinding[];
}

// Client rendering rules (human-readable; clients MUST enforce these)
export const CLIENT_RENDERING_RULES = [
  "Client MUST render question ordering exactly as defined in ordering.section_order, ordering.group_order and ordering.question_order",
  "Client MUST NOT locally reshuffle questions or answers",
  "Client MUST use answer_permutations from ordering.answer_permutations",
  "Client MUST treat snapshot as immutable and reload snapshot from server on reconnect",
  "Client MUST follow reference_bindings for passage highlighting and scroll sync",
  "If snapshot_hash mismatch occurs, client MUST lock exam UI and request server revalidation",
];
