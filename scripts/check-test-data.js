const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const attempts = await prisma.testAttempt.findMany({
    where: { userId: 3, status: 'COMPLETED' },
    select: { 
      testType: true, 
      score: true, 
      percentageScore: true, 
      testName: true,
      completedAt: true
    },
    orderBy: { completedAt: 'desc' },
    take: 20
  });
  
  console.log('Recent test attempts for user 3:');
  console.log(JSON.stringify(attempts, null, 2));
  
  const skillStats = await prisma.skillStatistics.findMany({
    where: { userId: 3 }
  });
  
  console.log('\nCurrent skill statistics:');
  console.log(JSON.stringify(skillStats, null, 2));
  
  await prisma.$disconnect();
}

check().catch(console.error);
