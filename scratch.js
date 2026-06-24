const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stats = await prisma.skillStatistics.findMany({ where: { userId: 8 } });
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
