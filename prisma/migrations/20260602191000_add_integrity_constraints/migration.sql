-- Add UNIQUE constraint for exam question ordering
ALTER TABLE `exam_questions`
ADD UNIQUE KEY `uq_exam_questions_exam_order` (`examId`, `orderIndex`);

-- Add FK constraints for versioned exam questions
ALTER TABLE `exam_questions`
ADD CONSTRAINT `exam_questions_questionVersionId_fkey`
FOREIGN KEY (`questionVersionId`) REFERENCES `question_versions`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add FK constraints for exam instances
ALTER TABLE `exam_instances`
ADD CONSTRAINT `exam_instances_examId_fkey`
FOREIGN KEY (`examId`) REFERENCES `exams`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT `exam_instances_studentId_fkey`
FOREIGN KEY (`studentId`) REFERENCES `users`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add FK constraints for exam submission -> exam instance
ALTER TABLE `exam_submissions`
ADD CONSTRAINT `exam_submissions_examInstanceId_fkey`
FOREIGN KEY (`examInstanceId`) REFERENCES `exam_instances`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add FK constraints for anti-cheat logs
ALTER TABLE `interaction_logs`
ADD CONSTRAINT `interaction_logs_examInstanceId_fkey`
FOREIGN KEY (`examInstanceId`) REFERENCES `exam_instances`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tab_switch_events`
ADD CONSTRAINT `tab_switch_events_examInstanceId_fkey`
FOREIGN KEY (`examInstanceId`) REFERENCES `exam_instances`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `focus_events`
ADD CONSTRAINT `focus_events_examInstanceId_fkey`
FOREIGN KEY (`examInstanceId`) REFERENCES `exam_instances`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `anomaly_flags`
ADD CONSTRAINT `anomaly_flags_examInstanceId_fkey`
FOREIGN KEY (`examInstanceId`) REFERENCES `exam_instances`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
