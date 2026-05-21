-- Migration: Make `topics` course-scoped and backfill data
-- Date: 2026-05-19
-- WARNING: Review and run this on a development/staging database first. Keep backups.

-- 1) Add nullable courseId to topics
ALTER TABLE `topics`
  ADD COLUMN `courseId` CHAR(36) NULL;

-- 2) Backfill topics that are linked to exactly one course via course_topics
UPDATE `topics` t
JOIN (
  SELECT topicId, MIN(courseId) AS courseId, COUNT(*) AS cnt
  FROM `course_topics`
  GROUP BY topicId
) ct ON t.id = ct.topicId
SET t.courseId = ct.courseId
WHERE ct.cnt = 1;

-- 3) For topics linked to multiple courses: duplicate topic rows per course and remap question_topics
CREATE TEMPORARY TABLE temp_topic_map (
  oldTopicId CHAR(36),
  courseId CHAR(36),
  newTopicId CHAR(36)
) ENGINE=MEMORY;

INSERT INTO temp_topic_map (oldTopicId, courseId, newTopicId)
SELECT ct.topicId, ct.courseId, UUID()
FROM `course_topics` ct
JOIN (
  SELECT topicId FROM `course_topics` GROUP BY topicId HAVING COUNT(*) > 1
) multi ON ct.topicId = multi.topicId;

-- Duplicate topic rows for each (oldTopicId, courseId)
INSERT INTO `topics` (id, code, name, createdAt, courseId)
SELECT tmap.newTopicId,
       CONCAT(t.code, '-', LEFT(tmap.courseId,8)),
       t.name,
       NOW(3),
       tmap.courseId
FROM temp_topic_map tmap
JOIN `topics` t ON t.id = tmap.oldTopicId;

-- Remap question_topics for questions whose course scope matches the courseId
UPDATE `question_topics` qt
JOIN `question_course_scopes` qcs ON qt.questionId = qcs.questionId
JOIN temp_topic_map tmap ON qt.topicId = tmap.oldTopicId AND qcs.courseId = tmap.courseId
SET qt.topicId = tmap.newTopicId;

-- Note: questions without an entry in question_course_scopes are left as-is and should be reviewed

-- 4) Rebuild course_topics from topics.courseId to ensure consistency
DELETE FROM `course_topics`;
INSERT INTO `course_topics` (courseId, topicId)
SELECT courseId, id FROM `topics` WHERE courseId IS NOT NULL;

-- 5) Make courseId non-nullable and add FK + composite unique constraint (courseId, code)
ALTER TABLE `topics`
  MODIFY COLUMN `courseId` CHAR(36) NOT NULL;

ALTER TABLE `topics`
  ADD CONSTRAINT `topics_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `topics` ADD UNIQUE KEY `topics_courseId_code_key` (`courseId`, `code`);

-- 6) Optional: list any orphan topics (no course) for manual review
SELECT * FROM `topics` WHERE `courseId` IS NULL;

-- Cleanup
DROP TEMPORARY TABLE IF EXISTS temp_topic_map;

-- End migration
