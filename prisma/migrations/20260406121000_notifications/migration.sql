-- Create notifications table
CREATE TABLE `notifications` (
  `id` VARCHAR(191) NOT NULL,
  `recipientId` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(191) NULL,
  `priority` VARCHAR(191) NOT NULL DEFAULT 'normal',
  `metadata` JSON NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `notifications_recipientId_isRead_idx`(`recipientId`, `isRead`),
  INDEX `notifications_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
