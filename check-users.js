const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Checking database...\n');
  
  // Count rankings
  const rankCount = await prisma.typingRanking.count();
  console.log('TypingRankings in table:', rankCount);
  
  // Get all typing results
  const results = await prisma.typingResult.findMany({
    select: { userId: true, wpm: true, accuracy: true },
    orderBy: { userId: 'asc' }
  });
  
  // Group by user
  const users = {};
  results.forEach(r => {
    if (!users[r.userId]) {
      users[r.userId] = { count: 0, bestWpm: 0, totalAcc: 0 };
    }
    users[r.userId].count++;
    users[r.userId].totalAcc += r.accuracy;
    if (r.wpm > users[r.userId].bestWpm) users[r.userId].bestWpm = r.wpm;
  });
  
  console.log('\nUsers with typing results:', Object.keys(users).length);
  Object.entries(users).forEach(([id, data]) => {
    const avgAcc = (data.totalAcc / data.count).toFixed(1);
    console.log(`  User ${id}: ${data.count} tests, Best WPM: ${data.bestWpm}, Avg Acc: ${avgAcc}%`);
  });
  
  await prisma.$disconnect();
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
