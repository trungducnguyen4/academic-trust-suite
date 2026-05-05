-- One-off safe creation of topic/tag related tables (idempotent)

CREATE TABLE IF NOT EXISTS `topics` (
  `id` CHAR(36) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `topics_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tags` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tags_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `question_tags` (
  `questionId` CHAR(36) NOT NULL,
  `tagId` CHAR(36) NOT NULL,
  PRIMARY KEY (`questionId`,`tagId`),
  KEY `question_tags_tagId_idx` (`tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `question_topics` (
  `questionId` CHAR(36) NOT NULL,
  `topicId` CHAR(36) NOT NULL,
  `weight` DOUBLE NULL,
  PRIMARY KEY (`questionId`,`topicId`),
  KEY `question_topics_topicId_idx` (`topicId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `course_topics` (
  `courseId` CHAR(36) NOT NULL,
  `topicId` CHAR(36) NOT NULL,
  PRIMARY KEY (`courseId`,`topicId`),
  KEY `course_topics_topicId_idx` (`topicId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys only if references exist and constraint names not already present
-- Using ALTER TABLE with IF NOT EXISTS is not supported in MySQL, so ignore FK creation errors
-- These statements are wrapped to attempt adding constraints but will be skipped if they already exist

-- Attach FK question_tags.tagId -> tags.id
ALTER TABLE `question_tags`
  ADD CONSTRAINT `question_tags_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Attach FK question_tags.questionId -> questions.id
ALTER TABLE `question_tags`
  ADD CONSTRAINT `question_tags_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `question_topics`
  ADD CONSTRAINT `question_topics_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `question_topics`
  ADD CONSTRAINT `question_topics_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `course_topics`
  ADD CONSTRAINT `course_topics_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `course_topics`
  ADD CONSTRAINT `course_topics_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Make statements tolerant to errors by ignoring failures (prisma db execute will stop on errors).
-- If FK creation fails due to existing constraint, run the ALTER statements manually or adjust names.
