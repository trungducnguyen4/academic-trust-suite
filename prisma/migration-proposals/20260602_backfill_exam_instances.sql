-- Create one exam instance per (exam, student) from existing submissions
INSERT INTO `exam_instances` (
  `id`,
  `examId`,
  `studentId`,
  `status`,
  `startedAt`,
  `submittedAt`,
  `lastActivityAt`,
  `createdAt`,
  `updatedAt`
)
SELECT
  UUID(),
  s.examId,
  s.studentId,
  CASE
    WHEN MAX(s.status) IN ('GRADED') THEN 'GRADED'
    WHEN MAX(s.status) IN ('FLAGGED') THEN 'FLAGGED'
    WHEN MAX(s.status) IN ('SUBMITTED','GRADE_PENDING') THEN 'SUBMITTED'
    ELSE 'IN_PROGRESS'
  END,
  MIN(s.startedAt),
  MAX(s.submittedAt),
  MAX(s.lastActivityAt),
  NOW(),
  NOW()
FROM `exam_submissions` s
GROUP BY s.examId, s.studentId;

-- Link submissions to their exam instance
UPDATE `exam_submissions` s
JOIN `exam_instances` i ON i.examId = s.examId AND i.studentId = s.studentId
SET s.examInstanceId = i.id
WHERE s.examInstanceId IS NULL;
