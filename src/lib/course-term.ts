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

const normalizeLegacyTermLabel = (legacyTerm?: string | null) => {
  if (!legacyTerm) return "";

  const normalized = legacyTerm.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized === "TERM_1") return TERM_LABELS.TERM_1;
  if (normalized === "TERM_2") return TERM_LABELS.TERM_2;
  if (normalized === "SUMMER") return TERM_LABELS.SUMMER;

  if (/^TERM\s*1$/i.test(legacyTerm)) return TERM_LABELS.TERM_1;
  if (/^TERM\s*2$/i.test(legacyTerm)) return TERM_LABELS.TERM_2;
  if (/^SUMMER$/i.test(legacyTerm)) return TERM_LABELS.SUMMER;

  return legacyTerm.trim();
};

export const formatCourseTerm = (
  academicYear?: string | null,
  term?: CourseTerm | null,
  legacySemester?: string | null,
) => {
  const year = academicYear?.trim();
  const termLabel = term ? TERM_LABELS[term] : "";
  const legacyLabel = normalizeLegacyTermLabel(legacySemester);

  if (termLabel && year) {
    return `${termLabel}`+' / '+`${year}`;
  }
  if (termLabel) return termLabel;
  if (legacyLabel && year) return `${legacyLabel}`+', '+`${year}`;
  if (legacyLabel) return legacyLabel;
  if (year) return year;

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
