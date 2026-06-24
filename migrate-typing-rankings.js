// Script to migrate existing typing results to TypingRanking table
// Try to use the singleton Prisma client if available, fall back to creating new instance
let prisma;
try {
  prisma = require('./src/models/prisma');
} catch (e) {
  console.log('Using direct PrismaClient initialization...');
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
}

async function migrateTypingRankings() {
  try {
    console.log('Starting migration of typing rankings...');
    
    // Get all existing typing results
    const allResults = await prisma.typingResult.findMany({
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            username: true,
            country: true,
          }
        }
      }
    });
    
    console.log(`Found ${allResults.length} typing results`);
    
    // Group by user and calculate stats
    const userMap = {};
    for (const r of allResults) {
      const uid = r.userId;
      if (!userMap[uid]) {
        userMap[uid] = {
          userId: uid,
          name: r.user?.full_name || r.user?.username || 'Anonymous',
          bestWpm: 0,
          totalAccuracy: 0,
          testsCompleted: 0,
        };
      }
      userMap[uid].testsCompleted += 1;
      userMap[uid].totalAccuracy += r.accuracy;
      if (r.wpm > userMap[uid].bestWpm) {
        userMap[uid].bestWpm = r.wpm;
      }
    }
    
    // Calculate scores and create/update TypingRanking entries
    const users = Object.values(userMap);
    console.log(`Processing ${users.length} unique users...`);
    
    for (const u of users) {
      const avgAccuracy = parseFloat((u.totalAccuracy / u.testsCompleted).toFixed(1));
      const score = Math.round((u.bestWpm * 0.7) + (avgAccuracy * 0.3));
      
      await prisma.typingRanking.upsert({
        where: { userId: u.userId },
        update: {
          bestWpm: u.bestWpm,
          avgAccuracy,
          testsCount: u.testsCompleted,
          score,
          lastTestDate: new Date(),
        },
        create: {
          userId: u.userId,
          bestWpm: u.bestWpm,
          avgAccuracy,
          testsCount: u.testsCompleted,
          score,
          lastTestDate: new Date(),
        }
      });
      
      console.log(`✅ User ${u.userId}: WPM=${u.bestWpm}, Accuracy=${avgAccuracy}%, Score=${score}`);
    }
    
    // Recalculate all ranks
    const allRankings = await prisma.typingRanking.findMany({
      orderBy: { score: 'desc' }
    });
    
    for (let i = 0; i < allRankings.length; i++) {
      await prisma.typingRanking.update({
        where: { id: allRankings[i].id },
        data: { rank: i + 1 }
      });
    }
    
    console.log(`\n✅ Migration complete! ${allRankings.length} users ranked.`);
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateTypingRankings();
