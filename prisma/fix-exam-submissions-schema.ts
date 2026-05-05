import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIRED_COLUMNS = [
  {
    name: 'submitLockedAt',
    sql: 'ALTER TABLE exam_submissions ADD COLUMN submitLockedAt DATETIME(3) NULL',
  },
  {
    name: 'lastAutosaveAt',
    sql: 'ALTER TABLE exam_submissions ADD COLUMN lastAutosaveAt DATETIME(3) NULL',
  },
  {
    name: 'lastActivityAt',
    sql: 'ALTER TABLE exam_submissions ADD COLUMN lastActivityAt DATETIME(3) NULL',
  },
  {
    name: 'submitIdempotencyKey',
    sql: 'ALTER TABLE exam_submissions ADD COLUMN submitIdempotencyKey VARCHAR(255) NULL',
  },
  {
    name: 'finalSnapshotVersion',
    sql: 'ALTER TABLE exam_submissions ADD COLUMN finalSnapshotVersion INT NULL',
  },
  {
    name: 'examSnapshotId',
    sql: 'ALTER TABLE exam_submissions ADD COLUMN examSnapshotId VARCHAR(191) NULL',
  },
];

async function main() {
  const existing = await prisma.$queryRawUnsafe<Array<{ Field: string }>>(
    'SHOW COLUMNS FROM exam_submissions',
  );
  const existingColumns = new Set(existing.map((row) => row.Field));

  for (const column of REQUIRED_COLUMNS) {
    if (existingColumns.has(column.name)) {
      console.log(`SKIP ${column.name}`);
      continue;
    }

    console.log(`ADD ${column.name}`);
    await prisma.$executeRawUnsafe(column.sql);
  }

  console.log('Exam submissions schema aligned.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
