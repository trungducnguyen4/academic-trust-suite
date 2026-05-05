import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe<Array<{ Field: string; Type: string; Null: string; Key: string; Default: any; Extra: string }>>(
    'SHOW COLUMNS FROM exam_submissions'
  );

  console.table(rows.map((row) => ({
    Field: row.Field,
    Type: row.Type,
    Null: row.Null,
    Key: row.Key,
    Default: row.Default,
    Extra: row.Extra,
  })));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
