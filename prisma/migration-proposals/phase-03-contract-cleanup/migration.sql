-- Phase 03: Contract cleanup (execute only when fallback-to-legacy read is disabled)
-- This phase is intentionally destructive. Schedule during controlled release window.

-- 1) Drop foreign key and legacy index before removing questions.courseId
ALTER TABLE `questions` DROP FOREIGN KEY `questions_courseId_fkey`;
DROP INDEX `questions_courseId_idx` ON `questions`;

-- 2) Remove legacy denormalized columns from questions
ALTER TABLE `questions`
  DROP COLUMN `courseId`,
  DROP COLUMN `tags`,
  DROP COLUMN `content`,
  DROP COLUMN `options`,
  DROP COLUMN `correctAnswer`,
  DROP COLUMN `explanation`,
  DROP COLUMN `difficulty`,
  DROP COLUMN `points`,
  MODIFY COLUMN `type` VARCHAR(64) NULL;

-- Keep `type` nullable in case type is now stored per version payload.
-- If you want hard consistency, keep a generated/derived type column later.
