import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const retentionDays = Number(process.env.IP_RETENTION_DAYS || '90');
  const pseudonymize = String(process.env.PSEUDONYMIZE || 'true') === 'true';
  const dryRun = String(process.env.DRY_RUN || 'true') === 'true';
  const salt = process.env.PSEUDONYMIZE_SALT || 'default-not-secure';

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  console.log(`Purge script started. cutoff=${cutoff.toISOString()} pseudonymize=${pseudonymize} dryRun=${dryRun}`);

  // Proctoring sessions
  const oldProctoring = await prisma.proctoringSession.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, ipAddress: true },
  });

  console.log(`Found ${oldProctoring.length} proctoring sessions older than cutoff`);

  let proctoringCount = 0;

  for (const p of oldProctoring) {
    if (dryRun) {
      proctoringCount += 1;
      continue;
    }

    if (pseudonymize && p.ipAddress) {
      const h = crypto.createHmac('sha256', salt).update(p.ipAddress).digest('hex');
      await prisma.proctoringSession.update({ where: { id: p.id }, data: { ipAddress: h } });
      proctoringCount += 1;
    } else if (!pseudonymize) {
      await prisma.proctoringSession.update({ where: { id: p.id }, data: { ipAddress: null } });
      proctoringCount += 1;
    }
  }

  // Exam link usages
  const oldUsages = await prisma.examLinkUsage.findMany({
    where: { usedAt: { lt: cutoff } },
    select: { id: true, ip: true },
  });

  console.log(`Found ${oldUsages.length} exam link usages older than cutoff`);

  let usageCount = 0;

  for (const u of oldUsages) {
    if (dryRun) {
      usageCount += 1;
      continue;
    }

    if (pseudonymize && u.ip) {
      const h = crypto.createHmac('sha256', salt).update(u.ip).digest('hex');
      await prisma.examLinkUsage.update({ where: { id: u.id }, data: { ip: h } as any });
      usageCount += 1;
    } else if (!pseudonymize) {
      await prisma.examLinkUsage.update({ where: { id: u.id }, data: { ip: null } as any });
      usageCount += 1;
    }
  }

  console.log(`Dry run: ${dryRun} - proctoring affected: ${proctoringCount}, usages affected: ${usageCount}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
