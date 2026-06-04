-- Remove legacy offline-download flag from persisted exam settings.
-- This keeps the database aligned with the simplified exam flow.

UPDATE `exams`
SET `settings` = JSON_REMOVE(`settings`, '$.requiresDownload')
WHERE JSON_VALID(`settings`)
  AND JSON_EXTRACT(`settings`, '$.requiresDownload') IS NOT NULL;

UPDATE `exam_snapshots`
SET `payload` = JSON_REMOVE(`payload`, '$.requiresDownload')
WHERE JSON_VALID(`payload`)
  AND JSON_EXTRACT(`payload`, '$.requiresDownload') IS NOT NULL;
