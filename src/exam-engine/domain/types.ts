export type UUID = string;

export interface Option {
  id: UUID;
  text: string;
}

export interface OptionSet {
  id: UUID;
  options: Option[];
}

export interface Question {
  id: UUID;
  version_id?: string;
  content: string;
  type: string;
  optionSetId?: UUID; // shared pool
  answers?: Option[]; // local answers
  display_order?: number;
  reference_anchor?: any;
}

export interface QuestionGroup {
  id: UUID;
  version_id?: string;
  title?: string;
  instruction?: string;
  group_type?: string;
  fixed_sequence?: boolean;
  shuffle_strategy?: string; // key to strategy
  questions: Question[];
  display_order?: number;
}

export interface Passage {
  id: UUID;
  version_id?: string;
  title?: string;
  instruction?: string;
  content?: string;
  media_url?: string;
  metadata?: any;
}

export interface ExamSection {
  id: UUID;
  version_id?: string;
  title?: string;
  instruction?: string;
  timing_policy?: any;
  shuffle_policy?: any;
  section_type?: string;
  passages: Passage[];
  groups: QuestionGroup[]; // groups that refer to passages by question.passage_id
  display_order?: number;
}

export interface ExamTemplate {
  id: UUID;
  title?: string;
  sections: ExamSection[];
}
