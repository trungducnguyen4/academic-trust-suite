CREATE TABLE IF NOT EXISTS `question_topics` (
  `questionId` varchar(36) NOT NULL,
  `topicId` varchar(36) NOT NULL,
  `weight` double DEFAULT NULL,
  PRIMARY KEY (`questionId`,`topicId`),
  KEY `topic_idx` (`topicId`)
);
