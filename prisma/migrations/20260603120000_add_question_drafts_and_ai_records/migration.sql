-- Add the missing V2 question workflow tables.
-- This migration is additive and preserves existing seeded data.

CREATE TABLE IF NOT EXISTS `question_drafts` (
  `id` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NULL,
  `creatorId` VARCHAR(191) NOT NULL,
  `mode` ENUM('MANUAL','AI_ASSISTED','DUPLICATE') NOT NULL,
  `currentStep` ENUM('INTENT','CONTENT','ANSWERS','CLASSIFICATION','REVIEW') NOT NULL DEFAULT 'INTENT',
  `autosaveVersion` INT NOT NULL DEFAULT 1,
  `state` JSON NOT NULL,
  `validation` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `question_drafts_creatorId_updatedAt_idx` (`creatorId`, `updatedAt`),
  KEY `question_drafts_questionId_idx` (`questionId`),
  CONSTRAINT `question_drafts_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_generation_records` (
  `id` VARCHAR(191) NOT NULL,
  `draftId` VARCHAR(191) NULL,
  `questionVersionId` VARCHAR(191) NULL,
  `section` ENUM('CONTENT','ANSWERS','EXPLANATION','CLASSIFICATION') NOT NULL,
  `status` ENUM('QUEUED','RUNNING','SUCCEEDED','FAILED','REJECTED') NOT NULL DEFAULT 'QUEUED',
  `provider` VARCHAR(191) NULL,
  `model` VARCHAR(191) NULL,
  `prompt` JSON NULL,
  `output` JSON NULL,
  `safetyFlags` JSON NULL,
  `errorMessage` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  KEY `ai_generation_records_draftId_createdAt_idx` (`draftId`, `createdAt`),
  KEY `ai_generation_records_questionVersionId_idx` (`questionVersionId`),
  KEY `ai_generation_records_status_idx` (`status`),
  CONSTRAINT `ai_generation_records_draftId_fkey`
    FOREIGN KEY (`draftId`) REFERENCES `question_drafts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ai_generation_records_questionVersionId_fkey`
    FOREIGN KEY (`questionVersionId`) REFERENCES `question_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
