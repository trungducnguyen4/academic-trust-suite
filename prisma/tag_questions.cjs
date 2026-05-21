const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main(){
  console.log('Creating topic UNTAGGED and linking questions...');
  const topicCode = 'UNTAGGED';
  const topicName = 'Untagged';

  let topic = await prisma.topic.findUnique({ where: { code: topicCode } });
  if (!topic) {
    topic = await prisma.topic.create({ data: { code: topicCode, name: topicName } });
    console.log('Created topic', topic.code);
  } else {
    console.log('Topic exists:', topic.code);
  }

  const questions = await prisma.question.findMany({ select: { id: true }, take: 100 });
  console.log(`Found ${questions.length} questions to tag.`);

  const data = questions.map(q => ({ questionId: q.id, topicId: topic.id, weight: 1 }));
  // createMany may skip duplicates
  await prisma.questionTopic.createMany({ data, skipDuplicates: true });
  console.log('Linked questions to topic UNTAGGED');
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(()=>prisma.$disconnect());
