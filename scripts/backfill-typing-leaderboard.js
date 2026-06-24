// Backfill script to populate TYPING_DOJO leaderboard from existing typing results
// Run with: node scripts/backfill-typing-leaderboard.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillTypingLeaderboard() {
  console.log('🔄 Starting Typing Dojo leaderboard backfill...\n');
  
  try {
    // Get or create the TYPING_DOJO leaderboard
    let typingLeaderboard = await prisma.leaderboard.findUnique({
      where: { category: 'TYPING_DOJO' }
    });
    
    if (!typingLeaderboard) {
      console.log('📋 Creating TYPING_DOJO leaderboard...');
      typingLeaderboard = await prisma.leaderboard.create({
        data: {
          category: 'TYPING_DOJO',
          title: 'Typing Dojo Masters',
          description: 'Highest WPM in Typing Dojo'
        }
      });
      console.log('✅ Created leaderboard');
    }
    
    // Get all typing results and aggregate manually
    const allResults = await prisma.typingResult.findMany({
      include: {
        user: {
          select: { id: true, full_name: true, username: true, country: true }
        }
      }
    });
    
    // Aggregate by userId
    const userMap = {};
    for (const r of allResults) {
      const uid = r.userId;
      if (!userMap[uid]) {
        userMap[uid] = {
          userId: uid,
          user: r.user,
          results: [],
          bestWpm: 0,
          totalWpm: 0,
          totalAccuracy: 0
        };
      }
      userMap[uid].results.push(r);
      userMap[uid].totalWpm += r.wpm;
      userMap[uid].totalAccuracy += r.accuracy;
      if (r.wpm > userMap[uid].bestWpm) {
        userMap[uid].bestWpm = r.wpm;
      }
    }
    
    const usersWithTyping = Object.values(userMap);
    console.log(`📝 Found ${usersWithTyping.length} users with typing results\n`);
    
    let updated = 0;
    let created = 0;
    
    for (const userData of usersWithTyping) {
      const userId = userData.userId;
      const bestWpm = userData.bestWpm;
      const avgAccuracy = userData.totalAccuracy / userData.results.length;
      const testsCompleted = userData.results.length;
      
      // Calculate score (weighted: 70% WPM, 30% accuracy)
      const score = Math.round((bestWpm * 0.7) + (avgAccuracy * 0.3));
      
      const user = userData.user;
      const userName = user?.full_name || user?.username || 'Anonymous';
      
      // Check if entry exists
      const existingEntry = await prisma.leaderboardEntry.findUnique({
        where: {
          leaderboardId_userId: {
            leaderboardId: typingLeaderboard.id,
            userId: userId
          }
        }
      });
      
      if (existingEntry) {
        // Update existing entry
        await prisma.leaderboardEntry.update({
          where: { id: existingEntry.id },
          data: {
            score: score,
            userName: userName,
            userCountry: user?.country || 'Unknown',
            updatedAt: new Date()
          }
        });
        updated++;
        console.log(`🔄 Updated: ${user?.username || userId} - Score: ${score} (WPM: ${bestWpm}, Acc: ${avgAccuracy.toFixed(1)}%)`);
      } else {
        // Create new entry
        await prisma.leaderboardEntry.create({
          data: {
            leaderboardId: typingLeaderboard.id,
            userId: userId,
            score: score,
            rank: 0, // Will recalculate
            trend: 'stable',
            trendAmount: '0',
            userName: userName,
            userCountry: user?.country || 'Unknown'
          }
        });
        created++;
        console.log(`➕ Created: ${user?.username || userId} - Score: ${score} (WPM: ${bestWpm}, Acc: ${avgAccuracy.toFixed(1)}%)`);
      }
    }
    
    // Recalculate all ranks
    console.log('\n📊 Recalculating ranks...');
    const allEntries = await prisma.leaderboardEntry.findMany({
      where: { leaderboardId: typingLeaderboard.id },
      orderBy: { score: 'desc' }
    });
    
    for (let i = 0; i < allEntries.length; i++) {
      await prisma.leaderboardEntry.update({
        where: { id: allEntries[i].id },
        data: { rank: i + 1 }
      });
    }
    
    console.log('\n✅ Backfill complete!');
    console.log(`   Updated: ${updated} entries`);
    console.log(`   Created: ${created} entries`);
    console.log(`   Total ranked: ${allEntries.length} users`);
    
    // Show top 10
    if (allEntries.length > 0) {
      console.log('\n🏆 Top 10 Typing Dojo Masters:');
      const top10 = allEntries.slice(0, 10);
      for (let i = 0; i < top10.length; i++) {
        console.log(`   ${i + 1}. ${top10[i].userName} - Score: ${top10[i].score}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

backfillTypingLeaderboard();
