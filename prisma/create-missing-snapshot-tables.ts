import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Creating missing snapshot tables...');

    // 1. Create question_snapshots table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS question_snapshots (
        id VARCHAR(36) PRIMARY KEY,
        originalQuestionId VARCHAR(36) NOT NULL,
        questionVersionId VARCHAR(36) NOT NULL,
        payload JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_originalQuestionId (originalQuestionId),
        KEY idx_questionVersionId (questionVersionId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ question_snapshots table created');

    // 2. Create exam_snapshots table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS exam_snapshots (
        id VARCHAR(36) PRIMARY KEY,
        examId VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        payload JSON,
        createdBy VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        publishedAt TIMESTAMP NULL,
        KEY idx_examId (examId),
        CONSTRAINT fk_exam_snapshots_exam FOREIGN KEY (examId) REFERENCES exams(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ exam_snapshots table created');

    // 3. Create exam_question_snapshots table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS exam_question_snapshots (
        id VARCHAR(36) PRIMARY KEY,
        examSnapshotId VARCHAR(36) NOT NULL,
        questionId VARCHAR(36) NOT NULL,
        questionVersionId VARCHAR(36),
        questionSnapshotId VARCHAR(36),
        orderIndex INT NOT NULL,
        points INT,
        payload JSON,
        KEY idx_examSnapshotId (examSnapshotId),
        KEY idx_questionId (questionId),
        CONSTRAINT fk_exam_question_snapshots_exam_snapshot FOREIGN KEY (examSnapshotId) REFERENCES exam_snapshots(id) ON DELETE CASCADE,
        CONSTRAINT fk_exam_question_snapshots_question_snapshot FOREIGN KEY (questionSnapshotId) REFERENCES question_snapshots(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ exam_question_snapshots table created');

    // 4. Add questionSnapshotId column to submission_answers if not exists
    const result = await prisma.$executeRawUnsafe(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'submission_answers' AND COLUMN_NAME = 'questionSnapshotId'
    `);

    if (result && Array.isArray(result) && result.length === 0) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE submission_answers 
        ADD COLUMN questionSnapshotId VARCHAR(36) NULL AFTER questionVersionId
      `);
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE submission_answers 
        ADD KEY idx_questionSnapshotId (questionSnapshotId)
      `);
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE submission_answers 
        ADD CONSTRAINT fk_submission_answers_question_snapshot 
        FOREIGN KEY (questionSnapshotId) REFERENCES question_snapshots(id)
      `);
      
      console.log('✅ questionSnapshotId column added to submission_answers');
    } else {
      console.log('ℹ️  questionSnapshotId column already exists in submission_answers');
    }

    console.log('✅ All snapshot tables and columns created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
