-- Migration: remove tags column and related tag tables
-- Generated: 2026-05-12

SET FOREIGN_KEY_CHECKS=0;

-- Drop tags column on questions if it exists
ALTER TABLE `questions` DROP COLUMN IF EXISTS `tags`;

-- Drop normalized tag tables if they exist
DROP TABLE IF EXISTS `question_tags`;
DROP TABLE IF EXISTS `tags`;

SET FOREIGN_KEY_CHECKS=1;

-- End migration
