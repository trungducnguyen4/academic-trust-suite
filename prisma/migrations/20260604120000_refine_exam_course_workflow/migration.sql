-- Additive workflow refinement for course import, question scoring, and exam snapshots.
-- This migration preserves seeded data and keeps legacy columns readable.

ALTER TABLE `courses`
  ADD COLUMN IF NOT EXISTS `subjectCode` VARCHAR(191) NULL,
  ADD INDEX `courses_subjectCode_idx` (`subjectCode`);

ALTER TABLE `questions`
  ADD COLUMN IF NOT EXISTS `defaultPoints` DECIMAL(5,2) NULL DEFAULT 1.00;

UPDATE `questions`
SET `defaultPoints` = COALESCE(CAST(`points` AS DECIMAL(5,2)), 1.00)
WHERE `defaultPoints` IS NULL;

ALTER TABLE `exams`
  ADD COLUMN IF NOT EXISTS `timeLimitMinutes` INT NULL,
  ADD COLUMN IF NOT EXISTS `maxAttempts` INT NULL,
  ADD COLUMN IF NOT EXISTS `gradingStrategy` ENUM('HIGHEST','AVERAGE','FIRST_ATTEMPT','LAST_ATTEMPT') NULL,
  ADD COLUMN IF NOT EXISTS `reviewSettings` JSON NULL,
  ADD COLUMN IF NOT EXISTS `questionSelectionConfig` JSON NULL,
  ADD INDEX `exams_gradingStrategy_idx` (`gradingStrategy`);

UPDATE `exams`
SET `timeLimitMinutes` = `duration`
WHERE `timeLimitMinutes` IS NULL;

UPDATE `exams`
SET `maxAttempts` = CASE
  WHEN JSON_VALID(`settings`) AND JSON_EXTRACT(`settings`, '$.maxAttempts') IS NOT NULL
    THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(`settings`, '$.maxAttempts')) AS UNSIGNED)
  ELSE `maxAttempts`
END;

ALTER TABLE `exam_questions`
  ADD COLUMN IF NOT EXISTS `assignedScore` DECIMAL(7,2) NULL DEFAULT 1.00,
  ADD INDEX `exam_questions_questionVersionId_idx` (`questionVersionId`);

UPDATE `exam_questions` eq
LEFT JOIN `questions` q ON q.id = eq.questionId
SET eq.assignedScore = COALESCE(eq.assignedScore, CAST(eq.points AS DECIMAL(7,2)), q.defaultPoints, 1.00);

ALTER TABLE `exam_instances`
  ADD COLUMN IF NOT EXISTS `examSnapshotId` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `snapshotPayload` JSON NULL,
  ADD COLUMN IF NOT EXISTS `randomizationSeed` VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS `questionOrder` JSON NULL,
  ADD INDEX `exam_instances_examSnapshotId_idx` (`examSnapshotId`);

ALTER TABLE `exam_instances`
  ADD CONSTRAINT `exam_instances_examSnapshotId_fkey`
    FOREIGN KEY (`examSnapshotId`) REFERENCES `exam_snapshots`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `exam_question_snapshots`
  ADD COLUMN IF NOT EXISTS `assignedScore` DECIMAL(7,2) NULL;

-- Keep legacy score columns available for compatibility while new code reads assignedScore/defaultPoints.
