-- Orphan checks (should return zero rows)
SELECT e.*
FROM `enrollments` e
LEFT JOIN `courses` c ON c.id = e.courseId
WHERE c.id IS NULL;

SELECT e.*
FROM `enrollments` e
LEFT JOIN `users` u ON u.id = e.studentId
WHERE u.id IS NULL;

SELECT ex.*
FROM `exams` ex
LEFT JOIN `courses` c ON c.id = ex.courseId
WHERE c.id IS NULL;

SELECT ex.*
FROM `exams` ex
LEFT JOIN `users` u ON u.id = ex.creatorId
WHERE u.id IS NULL;

SELECT eq.*
FROM `exam_questions` eq
LEFT JOIN `exams` ex ON ex.id = eq.examId
WHERE ex.id IS NULL;

SELECT eq.*
FROM `exam_questions` eq
LEFT JOIN `questions` q ON q.id = eq.questionId
WHERE q.id IS NULL;

SELECT eq.*
FROM `exam_questions` eq
LEFT JOIN `question_versions` qv ON qv.id = eq.questionVersionId
WHERE eq.questionVersionId IS NOT NULL AND qv.id IS NULL;

SELECT s.*
FROM `exam_submissions` s
LEFT JOIN `users` u ON u.id = s.studentId
WHERE u.id IS NULL;

SELECT s.*
FROM `exam_submissions` s
LEFT JOIN `exams` ex ON ex.id = s.examId
WHERE ex.id IS NULL;

SELECT sa.*
FROM `submission_answers` sa
LEFT JOIN `exam_submissions` s ON s.id = sa.submissionId
WHERE s.id IS NULL;

SELECT sa.*
FROM `submission_answers` sa
LEFT JOIN `questions` q ON q.id = sa.questionId
WHERE q.id IS NULL;

SELECT i.*
FROM `exam_instances` i
LEFT JOIN `exams` ex ON ex.id = i.examId
WHERE ex.id IS NULL;

SELECT i.*
FROM `exam_instances` i
LEFT JOIN `users` u ON u.id = i.studentId
WHERE u.id IS NULL;

-- Duplicate checks
SELECT courseId, studentId, COUNT(*) AS c
FROM `enrollments`
GROUP BY courseId, studentId
HAVING c > 1;

SELECT examId, orderIndex, COUNT(*) AS c
FROM `exam_questions`
GROUP BY examId, orderIndex
HAVING c > 1;
