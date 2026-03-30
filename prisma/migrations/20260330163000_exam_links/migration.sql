-- Create exam links table
CREATE TABLE `exam_links` (
  `id` VARCHAR(191) NOT NULL,
  `examId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(128) NOT NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NULL,
  `maxUses` INTEGER NULL,
  `usedCount` INTEGER NOT NULL DEFAULT 0,
  `lastUsedAt` DATETIME(3) NULL,
  `passwordHash` VARCHAR(255) NULL,
  `restrictedToCourse` BOOLEAN NOT NULL DEFAULT false,
  `disabled` BOOLEAN NOT NULL DEFAULT false,
  `note` TEXT NULL,
  `passwordAttempts` INTEGER NOT NULL DEFAULT 0,
  `lockedUntil` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `exam_links_tokenHash_key`(`tokenHash`),
  INDEX `exam_links_examId_idx`(`examId`),
  INDEX `exam_links_createdBy_idx`(`createdBy`),
  INDEX `exam_links_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create exam link usages table
CREATE TABLE `exam_link_usages` (
  `id` VARCHAR(191) NOT NULL,
  `linkId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `ip` VARCHAR(64) NULL,
  `userAgent` TEXT NULL,
  `usedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `exam_link_usages_linkId_idx`(`linkId`),
  INDEX `exam_link_usages_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign keys
ALTER TABLE `exam_links`
  ADD CONSTRAINT `exam_links_examId_fkey` FOREIGN KEY (`examId`) REFERENCES `exams`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `exam_links_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `exam_link_usages`
  ADD CONSTRAINT `exam_link_usages_linkId_fkey` FOREIGN KEY (`linkId`) REFERENCES `exam_links`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `exam_link_usages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
