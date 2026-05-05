import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function hasColumn(tableName: string, columnName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ cnt: bigint | number }>>(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    tableName,
    columnName,
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function hasIndex(tableName: string, indexName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ cnt: bigint | number }>>(
    `SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    tableName,
    indexName,
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function main() {
  const tableName = 'submission_answers';

  if (!(await hasColumn(tableName, 'questionSnapshotId'))) {
    console.log('ADD questionSnapshotId');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE submission_answers ADD COLUMN questionSnapshotId VARCHAR(191) NULL',
    );
  } else {
    console.log('SKIP questionSnapshotId (exists)');
  }

  if (!(await hasIndex(tableName, 'submission_answers_questionSnapshotId_idx'))) {
    console.log('ADD INDEX submission_answers_questionSnapshotId_idx');
    await prisma.$executeRawUnsafe(
      'CREATE INDEX submission_answers_questionSnapshotId_idx ON submission_answers(questionSnapshotId)',
    );
  } else {
    console.log('SKIP INDEX submission_answers_questionSnapshotId_idx (exists)');
  }

  console.log('submission_answers schema aligned.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
