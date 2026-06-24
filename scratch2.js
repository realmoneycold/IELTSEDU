const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const attempts = await prisma.testAttempt.findMany({ where: { userId: 8 }, orderBy: { completedAt: 'desc' }, take: 5 });
  console.log(JSON.stringify(attempts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
