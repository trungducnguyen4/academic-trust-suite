const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const topics = await prisma.topic.findMany();
    console.log('Topics count:', topics.length);
    console.log('Topics:', JSON.stringify(topics, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
