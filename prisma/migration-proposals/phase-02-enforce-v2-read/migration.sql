-- Phase 02: Enforce v2 read path after backfill reaches >99.99%
-- Run only after application is already dual-write and backfill is completed.

-- 1) Ensure every published question has at least one version.
-- If this query returns any row, stop and finish backfill first.
-- SELECT q.id FROM questions q LEFT JOIN question_versions v ON v.questionId = q.id WHERE q.status = 'PUBLISHED' GROUP BY q.id HAVING COUNT(v.id) = 0;

-- 2) Optionally make questionVersionId mandatory in exam/submission records after verification.
-- Keep commented until all rows are backfilled.
-- ALTER TABLE exam_questions MODIFY questionVersionId CHAR(36) NOT NULL;
-- ALTER TABLE submission_answers MODIFY questionVersionId CHAR(36) NOT NULL;

-- 3) Add safety index for fallback read performance during transition period.
CREATE INDEX `questions_creator_status_idx` ON `questions` (`creatorId`, `status`);
