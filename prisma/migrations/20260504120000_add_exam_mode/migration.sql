-- Add `mode` enum column to `exams` table
ALTER TABLE `exams` ADD COLUMN `mode` ENUM('NORMAL','LAB') NOT NULL DEFAULT 'NORMAL';
