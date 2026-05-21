-- Align `exam_submissions` with the current Prisma schema.
ALTER TABLE `exam_submissions`
ADD COLUMN IF NOT EXISTS `submitLockedAt` DATETIME(3) NULL AFTER `version`,
ADD COLUMN IF NOT EXISTS `lastAutosaveAt` DATETIME(3) NULL AFTER `submitLockedAt`,
ADD COLUMN IF NOT EXISTS `lastActivityAt` DATETIME(3) NULL AFTER `lastAutosaveAt`,
ADD COLUMN IF NOT EXISTS `submitIdempotencyKey` VARCHAR(255) NULL AFTER `lastActivityAt`,
ADD COLUMN IF NOT EXISTS `finalSnapshotVersion` INT NULL AFTER `submitIdempotencyKey`,
ADD COLUMN IF NOT EXISTS `examSnapshotId` VARCHAR(191) NULL AFTER `finalSnapshotVersion`;

-- Align `submission_answers` snapshot-related columns for legacy schemas.
ALTER TABLE `submission_answers`
ADD COLUMN IF NOT EXISTS `questionVersionId` VARCHAR(191) NULL AFTER `questionId`,
ADD COLUMN IF NOT EXISTS `questionSnapshotId` VARCHAR(191) NULL AFTER `questionVersionId`;

