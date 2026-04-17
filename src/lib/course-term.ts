export type CourseTerm = "TERM_1" | "TERM_2" | "SUMMER";

export const COURSE_TERM_OPTIONS = [
  { value: "TERM_1", label: "Term 1" },
  { value: "TERM_2", label: "Term 2" },
  { value: "SUMMER", label: "Summer" },
] as const;

const TERM_LABELS: Record<CourseTerm, string> = {
  TERM_1: "Term 1",
  TERM_2: "Term 2",
  SUMMER: "Summer",
};

export const getTermLabel = (term?: CourseTerm | null) =>
  term ? TERM_LABELS[term] : "";

export const formatCourseTerm = (
  academicYear?: string | null,
  term?: CourseTerm | null,
  legacySemester?: string | null,
) => {
  if (academicYear && term) {
    return `${academicYear} / ${TERM_LABELS[term]}`;
  }
  if (legacySemester) return legacySemester;
  return "N/A";
};

export const getDefaultAcademicYear = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month < 7 ? year - 1 : year;
  return `${startYear}-${startYear + 1}`;
};

export const getAcademicYearOptions = (date = new Date()) => {
  const year = date.getFullYear();
  const start = year - 1;
  const options: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    const from = start + i;
    options.push(`${from}-${from + 1}`);
  }
  return options;
};
