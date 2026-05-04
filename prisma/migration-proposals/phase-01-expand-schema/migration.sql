-- Phase 01: Expand schema (additive only, safe for zero-downtime rollout)
-- NOTE: This is a proposal SQL file. Validate against your MySQL version before applying.

ALTER TABLE `questions`
  ADD COLUMN `status` ENUM('DRAFT','IN_REVIEW','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `latestVersionNo` INT NOT NULL DEFAULT 1,
  ADD COLUMN `isReusable` TINYINT(1) NOT NULL DEFAULT 1;

CREATE INDEX `questions_status_idx` ON `questions` (`status`);

CREATE TABLE `question_versions` (
  `id` CHAR(36) NOT NULL,
  `questionId` CHAR(36) NOT NULL,
  `versionNo` INT NOT NULL,
  `stem` LONGTEXT NOT NULL,
  `payload` JSON NULL,
  `answerKey` JSON NULL,
  `explanation` LONGTEXT NULL,
  `difficulty` INT NULL,
  `points` INT NULL,
  `metadata` JSON NULL,
  `aiGenerated` TINYINT(1) NOT NULL DEFAULT 0,
  `createdBy` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `question_versions_questionId_versionNo_key` (`questionId`, `versionNo`),
  KEY `question_versions_questionId_createdAt_idx` (`questionId`, `createdAt`),
  CONSTRAINT `question_versions_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tags` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tags_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_tags` (
  `questionId` CHAR(36) NOT NULL,
  `tagId` CHAR(36) NOT NULL,
  PRIMARY KEY (`questionId`, `tagId`),
  KEY `question_tags_tagId_idx` (`tagId`),
  CONSTRAINT `question_tags_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `question_tags_tagId_fkey`
    FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `topics` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `topics_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_topics` (
  `questionId` CHAR(36) NOT NULL,
  `topicId` CHAR(36) NOT NULL,
  `weight` DOUBLE NULL,
  PRIMARY KEY (`questionId`, `topicId`),
  KEY `question_topics_topicId_idx` (`topicId`),
  CONSTRAINT `question_topics_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `question_topics_topicId_fkey`
    FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `course_topics` (
  `courseId` CHAR(36) NOT NULL,
  `topicId` CHAR(36) NOT NULL,
  PRIMARY KEY (`courseId`, `topicId`),
  KEY `course_topics_topicId_idx` (`topicId`),
  CONSTRAINT `course_topics_courseId_fkey`
    FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `course_topics_topicId_fkey`
    FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_course_scopes` (
  `questionId` CHAR(36) NOT NULL,
  `courseId` CHAR(36) NOT NULL,
  PRIMARY KEY (`questionId`, `courseId`),
  KEY `question_course_scopes_courseId_idx` (`courseId`),
  CONSTRAINT `question_course_scopes_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `question_course_scopes_courseId_fkey`
    FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_drafts` (
  `id` CHAR(36) NOT NULL,
  `questionId` CHAR(36) NULL,
  `creatorId` CHAR(36) NOT NULL,
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

CREATE TABLE `ai_generation_records` (
  `id` CHAR(36) NOT NULL,
  `draftId` CHAR(36) NULL,
  `questionVersionId` CHAR(36) NULL,
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

CREATE TABLE `question_usages` (
  `id` CHAR(36) NOT NULL,
  `questionId` CHAR(36) NOT NULL,
  `contextType` VARCHAR(64) NOT NULL,
  `contextId` CHAR(36) NOT NULL,
  `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `metrics` JSON NULL,
  PRIMARY KEY (`id`),
  KEY `question_usages_questionId_usedAt_idx` (`questionId`, `usedAt`),
  KEY `question_usages_contextType_contextId_idx` (`contextType`, `contextId`),
  CONSTRAINT `question_usages_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `exam_questions`
  ADD COLUMN `questionVersionId` CHAR(36) NULL,
  ADD KEY `exam_questions_questionVersionId_idx` (`questionVersionId`),
  ADD CONSTRAINT `exam_questions_questionVersionId_fkey`
    FOREIGN KEY (`questionVersionId`) REFERENCES `question_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `submission_answers`
  ADD COLUMN `questionVersionId` CHAR(36) NULL,
  ADD KEY `submission_answers_questionVersionId_idx` (`questionVersionId`),
  ADD CONSTRAINT `submission_answers_questionVersionId_fkey`
    FOREIGN KEY (`questionVersionId`) REFERENCES `question_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
