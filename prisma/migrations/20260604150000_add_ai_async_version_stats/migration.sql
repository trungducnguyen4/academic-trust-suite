-- Add async AI review/audit support, per-question-version statistics, and regrade audit logs.
-- Additive only: preserves seeded data and existing IDs.

ALTER TABLE `ai_generation_records`
  ADD COLUMN IF NOT EXISTS `reviewStatus` ENUM('PENDING','APPROVED','REJECTED','NEEDS_CHANGES') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS `reviewedBy` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `reviewedAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `reviewNotes` LONGTEXT NULL;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ai_generation_records'
    AND INDEX_NAME = 'ai_generation_records_reviewStatus_idx'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `ai_generation_records` ADD KEY `ai_generation_records_reviewStatus_idx` (`reviewStatus`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ai_generation_records'
    AND INDEX_NAME = 'ai_generation_records_reviewedBy_idx'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `ai_generation_records` ADD KEY `ai_generation_records_reviewedBy_idx` (`reviewedBy`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ai_generation_records'
    AND CONSTRAINT_NAME = 'ai_generation_records_reviewedBy_fkey'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `ai_generation_records` ADD CONSTRAINT `ai_generation_records_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `question_statistics` (
  `questionVersionId` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `totalAttempts` INT NOT NULL DEFAULT 0,
  `correctAttempts` INT NOT NULL DEFAULT 0,
  `incorrectAttempts` INT NOT NULL DEFAULT 0,
  `skippedAttempts` INT NOT NULL DEFAULT 0,
  `pValue` DECIMAL(5,4) NULL,
  `difficultyIndex` DECIMAL(5,4) NULL,
  `discriminationIndex` DECIMAL(5,4) NULL,
  `lastRecomputedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`questionVersionId`),
  KEY `question_statistics_questionId_idx` (`questionId`),
  CONSTRAINT `question_statistics_questionVersionId_fkey`
    FOREIGN KEY (`questionVersionId`) REFERENCES `question_versions`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `question_statistics_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'question_statistics'
    AND CONSTRAINT_NAME = 'question_statistics_questionVersionId_fkey'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `question_statistics` ADD CONSTRAINT `question_statistics_questionVersionId_fkey` FOREIGN KEY (`questionVersionId`) REFERENCES `question_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'question_statistics'
    AND CONSTRAINT_NAME = 'question_statistics_questionId_fkey'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `question_statistics` ADD CONSTRAINT `question_statistics_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `exam_submission_regrade_logs` (
  `id` VARCHAR(191) NOT NULL,
  `submissionId` VARCHAR(191) NOT NULL,
  `submissionAnswerId` VARCHAR(191) NOT NULL,
  `reviewerId` VARCHAR(191) NOT NULL,
  `previousPoints` INT NULL,
  `newPoints` INT NULL,
  `previousFeedback` LONGTEXT NULL,
  `newFeedback` LONGTEXT NULL,
  `reason` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `exam_submission_regrade_logs_submission_created_idx` (`submissionId`, `createdAt`),
  KEY `exam_submission_regrade_logs_submissionAnswerId_idx` (`submissionAnswerId`),
  KEY `exam_submission_regrade_logs_reviewerId_idx` (`reviewerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'exam_submission_regrade_logs'
    AND CONSTRAINT_NAME = 'exam_submission_regrade_logs_submissionId_fkey'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `exam_submission_regrade_logs` ADD CONSTRAINT `exam_submission_regrade_logs_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `exam_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'exam_submission_regrade_logs'
    AND CONSTRAINT_NAME = 'exam_submission_regrade_logs_submissionAnswerId_fkey'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `exam_submission_regrade_logs` ADD CONSTRAINT `exam_submission_regrade_logs_submissionAnswerId_fkey` FOREIGN KEY (`submissionAnswerId`) REFERENCES `submission_answers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'exam_submission_regrade_logs'
    AND CONSTRAINT_NAME = 'exam_submission_regrade_logs_reviewerId_fkey'
);
SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE `exam_submission_regrade_logs` ADD CONSTRAINT `exam_submission_regrade_logs_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'question_versions'
    AND INDEX_NAME = 'question_versions_createdBy_idx'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `question_versions` ADD KEY `question_versions_createdBy_idx` (`createdBy`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'submission_answers'
    AND INDEX_NAME = 'submission_answers_questionVersionId_idx'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE `submission_answers` ADD KEY `submission_answers_questionVersionId_idx` (`questionVersionId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
