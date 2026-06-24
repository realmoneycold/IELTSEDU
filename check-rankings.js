const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.typingRanking.count();
    console.log('TypingRanking count:', count);
    
    if (count > 0) {
      const rankings = await prisma.typingRanking.findMany({
        take: 5,
        orderBy: { score: 'desc' },
        include: {
          user: {
            select: {
              full_name: true,
              username: true
            }
          }
        }
      });
      console.log('Top 5 rankings:');
      rankings.forEach(r => {
        console.log(`  #${r.rank}: ${r.user?.full_name || r.user?.username || 'Unknown'} - Score: ${r.score}, WPM: ${r.bestWpm}, Acc: ${r.avgAccuracy}%`);
      });
    } else {
      console.log('No rankings found in the table.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
