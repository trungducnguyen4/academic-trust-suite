-- Backfill questionVersionId using latest question version
UPDATE `exam_questions` eq
JOIN `questions` q ON q.id = eq.questionId
JOIN `question_versions` qv
  ON qv.questionId = q.id AND qv.versionNo = q.latestVersionNo
SET eq.questionVersionId = qv.id
WHERE eq.questionVersionId IS NULL;

-- Backfill weight using existing exam question points or question defaults
UPDATE `exam_questions` eq
LEFT JOIN `questions` q ON q.id = eq.questionId
SET eq.weight = COALESCE(eq.points, q.points, 1)
WHERE eq.weight IS NULL;
