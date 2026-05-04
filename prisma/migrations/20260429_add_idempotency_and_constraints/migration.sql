-- Add attemptNo to ExamSubmission for idempotency versioning
ALTER TABLE `exam_submissions` ADD COLUMN `attemptNo` INT NOT NULL DEFAULT 1;

-- Add unique constraint for (examId, studentId, attemptNo) to prevent duplicate submissions per attempt
ALTER TABLE `exam_submissions` ADD UNIQUE KEY `unq_exam_student_attempt` (`examId`, `studentId`, `attemptNo`);

-- Add unique constraint for (submissionId, questionId) to prevent duplicate answers
ALTER TABLE `submission_answers` ADD UNIQUE KEY `unq_submission_question` (`submissionId`, `questionId`);

-- Add sequence-based autosave fields
ALTER TABLE `submission_answers` ADD COLUMN `sequence` INT NOT NULL DEFAULT 1;
ALTER TABLE `submission_answers` ADD COLUMN `clientBatchId` VARCHAR(255) NULL;
ALTER TABLE `submission_answers` ADD COLUMN `serverVersion` INT NOT NULL DEFAULT 0;
ALTER TABLE `submission_answers` ADD COLUMN `questionVersionId` VARCHAR(191) NULL;
ALTER TABLE `submission_answers` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- Add composite indexes for burst scenarios
ALTER TABLE `exam_submissions` ADD INDEX `idx_exam_student_status` (`examId`, `studentId`, `status`);
ALTER TABLE `exam_submissions` ADD INDEX `idx_student_status_created` (`studentId`, `status`, `createdAt`);

-- Add index for question version lookups in submissions
ALTER TABLE `submission_answers` ADD INDEX `idx_submission_version` (`submissionId`, `questionVersionId`);
ALTER TABLE `submission_answers` ADD INDEX `idx_submission_question_sequence` (`submissionId`, `questionId`, `sequence`);

-- Add index for question filtering by creator
ALTER TABLE `questions` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT';
ALTER TABLE `questions` ADD INDEX `idx_creator_status_updated` (`creatorId`, `status`, `updatedAt`);

-- Add index for exam question performance
ALTER TABLE `exam_questions` ADD INDEX `idx_exam_question` (`examId`, `questionId`);
