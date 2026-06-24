const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting migration...');
  
  // Get all typing results
  const results = await prisma.typingResult.findMany({
    include: { user: { select: { full_name: true, username: true } } }
  });
  
  console.log('Found', results.length, 'typing results');
  
  const users = {};
  for (const r of results) {
    const uid = r.userId;
    if (!users[uid]) {
      users[uid] = { userId: uid, bestWpm: 0, totalAcc: 0, count: 0, name: r.user?.full_name || r.user?.username || 'User ' + uid };
    }
    users[uid].count++;
    users[uid].totalAcc += r.accuracy;
    if (r.wpm > users[uid].bestWpm) users[uid].bestWpm = r.wpm;
  }
  
  console.log('Processing', Object.keys(users).length, 'users');
  
  for (const u of Object.values(users)) {
    const avgAcc = parseFloat((u.totalAcc / u.count).toFixed(1));
    const score = Math.round((u.bestWpm * 0.7) + (avgAcc * 0.3));
    
    await prisma.typingRanking.upsert({
      where: { userId: u.userId },
      update: { bestWpm: u.bestWpm, avgAccuracy: avgAcc, testsCount: u.count, score },
      create: { userId: u.userId, bestWpm: u.bestWpm, avgAccuracy: avgAcc, testsCount: u.count, score, lastTestDate: new Date() }
    });
    console.log('Updated:', u.name, 'WPM:', u.bestWpm, 'Score:', score);
  }
  
  // Recalculate ranks
  const all = await prisma.typingRanking.findMany({ orderBy: { score: 'desc' } });
  for (let i = 0; i < all.length; i++) {
    await prisma.typingRanking.update({ where: { id: all[i].id }, data: { rank: i + 1 } });
  }
  
  console.log('Done! Total ranked users:', all.length);
  await prisma.$disconnect();
}

migrate().catch(e => { console.error(e); process.exit(1); });
