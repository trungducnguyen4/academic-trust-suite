-- Add versioned question and snapshot tables required by the schema.
-- This migration must run before integrity constraints that reference question_versions.

CREATE TABLE `question_versions` (
  `id` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `versionNo` INT NOT NULL,
  `stem` LONGTEXT NOT NULL,
  `payload` JSON NULL,
  `answerKey` JSON NULL,
  `explanation` LONGTEXT NULL,
  `difficulty` INT NULL,
  `points` INT NULL,
  `metadata` JSON NULL,
  `aiGenerated` TINYINT(1) NOT NULL DEFAULT 0,
  `createdBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `question_versions_questionId_versionNo_key` (`questionId`, `versionNo`),
  KEY `question_versions_questionId_createdAt_idx` (`questionId`, `createdAt`),
  CONSTRAINT `question_versions_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `questions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_snapshots` (
  `id` VARCHAR(191) NOT NULL,
  `originalQuestionId` VARCHAR(191) NOT NULL,
  `questionVersionId` VARCHAR(191) NOT NULL,
  `payload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_originalQuestionId` (`originalQuestionId`),
  KEY `idx_questionVersionId` (`questionVersionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `exam_snapshots` (
  `id` VARCHAR(191) NOT NULL,
  `examId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `payload` JSON NULL,
  `createdBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `publishedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `idx_examId` (`examId`),
  CONSTRAINT `fk_exam_snapshots_exam`
    FOREIGN KEY (`examId`) REFERENCES `exams` (`id`)
    ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `exam_question_snapshots` (
  `id` VARCHAR(191) NOT NULL,
  `examSnapshotId` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `questionVersionId` VARCHAR(191) NULL,
  `questionSnapshotId` VARCHAR(191) NULL,
  `orderIndex` INT NOT NULL,
  `points` INT NULL,
  `payload` JSON NULL,
  PRIMARY KEY (`id`),
  KEY `idx_examSnapshotId` (`examSnapshotId`),
  KEY `idx_questionId` (`questionId`),
  KEY `idx_questionSnapshotId` (`questionSnapshotId`),
  CONSTRAINT `fk_exam_question_snapshots_exam_snapshot`
    FOREIGN KEY (`examSnapshotId`) REFERENCES `exam_snapshots` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_exam_question_snapshots_question_snapshot`
    FOREIGN KEY (`questionSnapshotId`) REFERENCES `question_snapshots` (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

