-- Add enum-backed status columns
ALTER TABLE `courses`
ADD COLUMN IF NOT EXISTS `statusEnum` ENUM('DRAFT','ACTIVE','ARCHIVED') NULL;

ALTER TABLE `enrollments`
ADD COLUMN IF NOT EXISTS `statusEnum` ENUM('ACTIVE','DROPPED','COMPLETED') NULL;

ALTER TABLE `exams`
ADD COLUMN IF NOT EXISTS `statusEnum` ENUM('DRAFT','PUBLISHED','ONGOING','COMPLETED','ARCHIVED') NULL,
ADD COLUMN IF NOT EXISTS `scoringScale` INT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS `scoringRounding` INT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS `scoringNormalization` ENUM('LINEAR') NULL DEFAULT 'LINEAR',
ADD COLUMN IF NOT EXISTS `allowLateSubmission` TINYINT(1) NULL DEFAULT 0;

ALTER TABLE `exam_submissions`
ADD COLUMN IF NOT EXISTS `statusEnum` ENUM('IN_PROGRESS','SUBMITTING','SUBMITTED','GRADE_PENDING','GRADED','FLAGGED','SUBMIT_FAILED') NULL,
ADD COLUMN IF NOT EXISTS `examInstanceId` VARCHAR(191) NULL;

-- Exam question scoring and snapshot linkage
ALTER TABLE `exam_questions`
ADD COLUMN IF NOT EXISTS `questionVersionId` VARCHAR(191) NULL,
ADD COLUMN IF NOT EXISTS `weight` DECIMAL(5,2) NULL,
ADD COLUMN IF NOT EXISTS `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- New exam instance table (no FKs yet; added in a follow-up migration)
CREATE TABLE IF NOT EXISTS `exam_instances` (
  `id` VARCHAR(191) NOT NULL,
  `examId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `status` ENUM('NOT_STARTED','IN_PROGRESS','SUBMITTED','GRADED','FLAGGED','EXPIRED') NOT NULL DEFAULT 'NOT_STARTED',
  `startedAt` DATETIME(3) NULL,
  `submittedAt` DATETIME(3) NULL,
  `lastActivityAt` DATETIME(3) NULL,
  `ipAddress` VARCHAR(64) NULL,
  `userAgent` TEXT NULL,
  `encryptedPayload` LONGBLOB NULL,
  `payloadChecksum` VARCHAR(64) NULL,
  `rawScore` DECIMAL(7,2) NULL,
  `maxRawScore` DECIMAL(7,2) NULL,
  `normalizedScore` DECIMAL(5,2) NULL,
  `anomalyScore` DECIMAL(5,2) NULL,
  `suspiciousFlag` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_exam_instances_exam_student` (`examId`, `studentId`),
  INDEX `idx_exam_instances_exam` (`examId`),
  INDEX `idx_exam_instances_student` (`studentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `interaction_logs` (
  `id` VARCHAR(191) NOT NULL,
  `examInstanceId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(191) NOT NULL,
  `payload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `idx_interaction_logs_instance_created` (`examInstanceId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tab_switch_events` (
  `id` VARCHAR(191) NOT NULL,
  `examInstanceId` VARCHAR(191) NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `durationMs` INT NULL,
  `fromTab` VARCHAR(191) NULL,
  `toTab` VARCHAR(191) NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_tab_switch_events_instance_occurred` (`examInstanceId`, `occurredAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `focus_events` (
  `id` VARCHAR(191) NOT NULL,
  `examInstanceId` VARCHAR(191) NOT NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `focusState` ENUM('FOCUSED','BLURRED') NOT NULL,
  `reason` VARCHAR(191) NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_focus_events_instance_occurred` (`examInstanceId`, `occurredAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `anomaly_flags` (
  `id` VARCHAR(191) NOT NULL,
  `examInstanceId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `score` DECIMAL(5,2) NULL,
  `status` ENUM('OPEN','REVIEWED','DISMISSED','CONFIRMED') NOT NULL DEFAULT 'OPEN',
  `reviewerId` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` DATETIME(3) NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_anomaly_flags_instance` (`examInstanceId`),
  INDEX `idx_anomaly_flags_status` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add indexes for frequent queries
CREATE INDEX `idx_exam_questions_exam_order` ON `exam_questions` (`examId`, `orderIndex`);
CREATE INDEX `idx_exam_questions_question_version` ON `exam_questions` (`questionVersionId`);
CREATE INDEX `idx_exam_submissions_instance` ON `exam_submissions` (`examInstanceId`);
