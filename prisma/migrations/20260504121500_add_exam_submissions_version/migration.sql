-- Add `version` column to `exam_submissions` for Prisma schema alignment
ALTER TABLE `exam_submissions` ADD COLUMN `version` INT NOT NULL DEFAULT 0;
