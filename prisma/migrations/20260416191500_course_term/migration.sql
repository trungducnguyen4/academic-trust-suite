-- AlterTable
ALTER TABLE `courses` ADD COLUMN `academicYear` VARCHAR(191) NULL,
	ADD COLUMN `term` ENUM('TERM_1', 'TERM_2', 'SUMMER') NULL;
