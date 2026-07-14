-- Remove duplicated course metadata columns after migration to academicYear + term.

ALTER TABLE `courses`
  DROP INDEX `courses_subjectCode_idx`,
  DROP COLUMN `subjectCode`,
  DROP COLUMN `semester`;
