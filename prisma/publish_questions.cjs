const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function main(){
  console.log('Publishing questions: create question_versions and mark PUBLISHED');
  const questions = await prisma.question.findMany({ select: { id: true, content: true, options: true, correctAnswer: true, courseId: true, creatorId: true } });
  console.log(`Found ${questions.length} questions`);

  const hasQv = await prisma.$queryRaw`SHOW TABLES LIKE 'question_versions'`;
  const hasQcs = await prisma.$queryRaw`SHOW TABLES LIKE 'question_course_scopes'`;

  for (const q of questions){
    try {
      if (Array.isArray(hasQv) && hasQv.length > 0) {
        // check if version exists
        const existing = await prisma.$queryRawUnsafe(`SELECT id FROM question_versions WHERE questionId = ? LIMIT 1`, q.id);
        if (!existing || existing.length === 0) {
          const versionId = randomUUID();
          await prisma.$executeRawUnsafe(`INSERT INTO question_versions (id, questionId, versionNo, stem, payload, answerKey, explanation, difficulty, points, metadata, aiGenerated, createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`, versionId, q.id, 1, q.content, JSON.stringify(q.options || {}), JSON.stringify(q.correctAnswer || {}), null, 1, 1, JSON.stringify({}), 0, q.creatorId);
          console.log('Inserted version for', q.id);
        }
      }

      // ensure course scope mapping
      if (Array.isArray(hasQcs) && hasQcs.length > 0 && q.courseId) {
        await prisma.$executeRawUnsafe(`INSERT INTO question_course_scopes (questionId, courseId) VALUES (?, ?) ON DUPLICATE KEY UPDATE questionId = VALUES(questionId)`, q.id, q.courseId);
      }

      // update question status and latestVersionNo if columns exist
      await prisma.$executeRawUnsafe(`UPDATE questions SET status = 'PUBLISHED', latestVersionNo = 1 WHERE id = ?`, q.id);
    } catch (e) {
      console.warn('Failed for', q.id, e.message || e);
    }
  }

  console.log('Done publishing');
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
