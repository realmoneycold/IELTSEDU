/**
 * Recalculate skill statistics for all users
 * Fixes incorrect averages that were calculated using wrong score field
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculateSkillStats() {
  console.log('Starting skill statistics recalculation...');
  
  try {
    // Get all users with test attempts
    const users = await prisma.user.findMany({
      where: {
        testAttempts: {
          some: {}
        }
      },
      select: {
        id: true,
        email: true
      }
    });
    
    console.log(`Found ${users.length} users with test attempts`);
    
    for (const user of users) {
      console.log(`\nProcessing user ${user.id} (${user.email})...`);
      
      // Get all test types this user has attempted
      const testTypes = await prisma.testAttempt.findMany({
        where: {
          userId: user.id,
          status: 'COMPLETED'
        },
        distinct: ['testType'],
        select: {
          testType: true
        }
      });
      
      for (const { testType } of testTypes) {
        // Get all attempts for this skill
        const attempts = await prisma.testAttempt.findMany({
          where: {
            userId: user.id,
            testType,
            status: 'COMPLETED'
          },
          orderBy: {
            completedAt: 'asc'
          }
        });
        
        if (attempts.length === 0) continue;
        
        console.log(`  ${testType}: ${attempts.length} attempts`);
        
        // Calculate scores using correct logic
        const scores = attempts.map(a => {
          const isBandScore = a.testType === 'SPEAKING' || a.testType === 'WRITING';
          if (isBandScore) {
            // Use actual band score converted to percentage
            return ((a.score || 0) / 9) * 100;
          }
          return a.percentageScore || 0;
        }).filter(s => s > 0);
        
        const times = attempts.map(a => a.timeSpentSeconds || 0).filter(t => t > 0);
        
        if (scores.length === 0) {
          console.log(`    No valid scores found`);
          continue;
        }
        
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const bestScore = Math.max(...scores);
        const worstScore = Math.min(...scores);
        
        console.log(`    Average: ${averageScore.toFixed(1)}%, Best: ${bestScore.toFixed(1)}%, Worst: ${worstScore.toFixed(1)}%`);
        console.log(`    (Converts to Band ${(averageScore / 100 * 9).toFixed(1)} for speaking/writing)`);
        
        // Update skill statistics
        await prisma.skillStatistics.upsert({
          where: {
            userId_skill: { userId: user.id, skill: testType }
          },
          update: {
            totalAttempts: attempts.length,
            completedAttempts: attempts.filter(a => a.status === 'COMPLETED').length,
            averageScore,
            bestScore,
            worstScore,
            totalTimeSpentSeconds: times.reduce((a, b) => a + b, 0),
            averageTimeSpentSeconds: times.length > 0 ? Math.floor(times.reduce((a, b) => a + b, 0) / times.length) : 0,
            lastAttemptAt: attempts[attempts.length - 1].completedAt
          },
          create: {
            userId: user.id,
            skill: testType,
            totalAttempts: attempts.length,
            completedAttempts: attempts.filter(a => a.status === 'COMPLETED').length,
            averageScore,
            bestScore,
            worstScore,
            totalTimeSpentSeconds: times.reduce((a, b) => a + b, 0),
            averageTimeSpentSeconds: times.length > 0 ? Math.floor(times.reduce((a, b) => a + b, 0) / times.length) : 0,
            lastAttemptAt: attempts[attempts.length - 1].completedAt
          }
        });
        
        console.log(`    ✓ Updated`);
      }
    }
    
    console.log('\n✅ Skill statistics recalculation complete!');
    
  } catch (error) {
    console.error('Error recalculating skill statistics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateSkillStats();
