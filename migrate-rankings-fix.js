const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🚀 Starting migration...');
    
    // Clear existing rankings
    await prisma.typingRanking.deleteMany({});
    console.log('✅ Cleared existing rankings');
    
    // Get all users from typing_results
    const userResults = await prisma.typingResult.groupBy({
      by: ['userId'],
      _max: { wpm: true },
      _avg: { accuracy: true },
      _count: { id: true }
    });
    
    console.log(`📊 Found ${userResults.length} users with typing data`);
    
    if (userResults.length === 0) {
      console.log('⚠️ No typing results found');
      return;
    }
    
    // Create rankings for each user
    const rankingsData = userResults.map(r => {
      const bestWpm = r._max.wpm || 0;
      const avgAccuracy = r._avg.accuracy || 0;
      const score = Math.round((bestWpm * 0.7) + (avgAccuracy * 0.3));
      
      return {
        userId: r.userId,
        bestWpm,
        avgAccuracy,
        testsCount: r._count.id,
        score,
        lastTestDate: new Date()
      };
    });
    
    // Sort by score descending
    rankingsData.sort((a, b) => b.score - a.score);
    
    // Add rank to each entry
    for (let i = 0; i < rankingsData.length; i++) {
      rankingsData[i].rank = i + 1;
    }
    
    // Insert into database
    await prisma.typingRanking.createMany({
      data: rankingsData
    });
    
    console.log(`✅ Created ${rankingsData.length} rankings`);
    
    // Verify
    const count = await prisma.typingRanking.count();
    console.log(`📊 Total rankings in database: ${count}`);
    
    // Show top 5
    const top5 = await prisma.typingRanking.findMany({
      orderBy: { score: 'desc' },
      take: 5
    });
    console.log('🏆 Top 5:', top5.map(r => ({ userId: r.userId, score: r.score, rank: r.rank })));
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
