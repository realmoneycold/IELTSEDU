'use strict';

const prisma = require('../models/prisma');

// ─── GET LEADERBOARD ────────────────────────────────────────────────────────
// GET /api/typing/leaderboard
// Query params: limit (default 10, max 100), period ('all'|'weekly'|'monthly'), userId (optional)
async function getLeaderboard(req, res) {
  try {
    let { limit = 10, period = 'all', userId } = req.query;

    // Sanitize limit
    limit = parseInt(limit) || 10;
    if (limit > 200) limit = 200;
    if (limit < 1) limit = 1;

    // Sanitize period
    const validPeriods = ['all', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) period = 'all';

    // Build date filter
    let dateFilter = {};
    if (period === 'weekly') {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      dateFilter = { date: { gte: from } };
    } else if (period === 'monthly') {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      dateFilter = { date: { gte: from } };
    }

    // Aggregate all typing results per user
    const allResults = await prisma.typingResult.findMany({
      where: dateFilter,
      select: {
        userId: true,
        wpm: true,
        accuracy: true,
        date: true,
        user: {
          select: {
            id: true,
            full_name: true,
            username: true,
            country: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // If no results, return empty
    if (!allResults.length) {
      return res.status(200).json({
        success: true,
        data: {
          period,
          byWpm: [],
          byAccuracy: [],
          userRank: null,
        },
      });
    }

    // Aggregate per user: best WPM, avg accuracy, test count
    const userMap = {};
    for (const r of allResults) {
      const uid = r.userId;
      if (!userMap[uid]) {
        userMap[uid] = {
          userId: uid,
          name: r.user.full_name || r.user.username || 'Anonymous',
          username: r.user.username || null,
          country: r.user.country || null,
          bestWpm: 0,
          totalWpm: 0,
          totalAccuracy: 0,
          testsCompleted: 0,
        };
      }
      userMap[uid].testsCompleted += 1;
      userMap[uid].totalWpm += r.wpm;
      userMap[uid].totalAccuracy += r.accuracy;
      if (r.wpm > userMap[uid].bestWpm) {
        userMap[uid].bestWpm = r.wpm;
      }
    }

    const aggregated = Object.values(userMap).map((u) => ({
      ...u,
      avgWpm: Math.round(u.totalWpm / u.testsCompleted),
      avgAccuracy: parseFloat((u.totalAccuracy / u.testsCompleted).toFixed(1)),
    }));

    // Sort by best WPM
    const byWpm = [...aggregated]
      .sort((a, b) => b.bestWpm - a.bestWpm)
      .slice(0, limit)
      .map((u, i) => ({
        rank: i + 1,
        name: u.name,
        username: u.username,
        country: u.country,
        wpm: u.bestWpm,
        avgWpm: u.avgWpm,
        accuracy: u.avgAccuracy,
        testsCompleted: u.testsCompleted,
        userId: u.userId,
      }));

    // Sort by best accuracy (among those with ≥1 test)
    const byAccuracy = [...aggregated]
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
      .slice(0, limit)
      .map((u, i) => ({
        rank: i + 1,
        name: u.name,
        username: u.username,
        country: u.country,
        wpm: u.bestWpm,
        avgWpm: u.avgWpm,
        accuracy: u.avgAccuracy,
        testsCompleted: u.testsCompleted,
        userId: u.userId,
      }));

    // Optional: find requesting user's rank
    let userRank = null;
    const requestUserId = userId ? parseInt(userId) : (req.user?.id || null);
    if (requestUserId) {
      const allByWpm = [...aggregated].sort((a, b) => b.bestWpm - a.bestWpm);
      const wpmRankIdx = allByWpm.findIndex((u) => u.userId === requestUserId);

      const allByAcc = [...aggregated].sort((a, b) => b.avgAccuracy - a.avgAccuracy);
      const accRankIdx = allByAcc.findIndex((u) => u.userId === requestUserId);

      if (wpmRankIdx !== -1) {
        const u = allByWpm[wpmRankIdx];
        userRank = {
          wpmRank: wpmRankIdx + 1,
          accuracyRank: accRankIdx + 1,
          bestWpm: u.bestWpm,
          avgAccuracy: u.avgAccuracy,
          testsCompleted: u.testsCompleted,
          totalUsers: aggregated.length,
          // Nearby users (±2 around user's WPM rank)
          nearbyByWpm: allByWpm
            .slice(Math.max(0, wpmRankIdx - 2), wpmRankIdx + 3)
            .map((u2, idx) => ({
              rank: Math.max(1, wpmRankIdx - 2) + idx + 1,
              name: u2.name,
              wpm: u2.bestWpm,
              accuracy: u2.avgAccuracy,
              isCurrentUser: u2.userId === requestUserId,
            })),
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        period,
        totalUsers: aggregated.length,
        byWpm,
        byAccuracy,
        userRank,
      },
    });
  } catch (err) {
    console.error('Get typing leaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}

// ─── SUBMIT TYPING RESULT ──────────────────────────────────────────────────
// POST /api/typing/submit
async function submitTypingResult(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { wpm, accuracy, durationMinutes, difficulty } = req.body;

    if (typeof wpm !== 'number' || typeof accuracy !== 'number') {
      return res.status(400).json({ success: false, message: 'wpm and accuracy are required numbers' });
    }
    if (wpm < 0 || wpm > 300) {
      return res.status(400).json({ success: false, message: 'wpm must be between 0 and 300' });
    }
    if (accuracy < 0 || accuracy > 100) {
      return res.status(400).json({ success: false, message: 'accuracy must be between 0 and 100' });
    }

    // Validate difficulty
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    const normalizedDifficulty = difficulty && validDifficulties.includes(difficulty.toLowerCase())
      ? difficulty.toLowerCase()
      : 'intermediate';

    const result = await prisma.typingResult.create({
      data: {
        userId,
        wpm: parseFloat(wpm),
        accuracy: parseFloat(accuracy),
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 2,
        difficulty: normalizedDifficulty,
      },
    });

    // Update study streak for today
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    await prisma.studyStreak.upsert({
      where: { userId_date: { userId, date: today } },
      update: { isCompleted: true },
      create: { userId, date: today, isCompleted: true },
    });

    // Update TypingRanking table - this stores and compares ALL users
    try {
      // Get all user's typing results to calculate best WPM and avg accuracy
      const userResults = await prisma.typingResult.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
      });

      const bestWpm = Math.max(...userResults.map(r => r.wpm));
      const avgAccuracy = parseFloat((userResults.reduce((sum, r) => sum + r.accuracy, 0) / userResults.length).toFixed(1));
      const score = Math.round((bestWpm * 0.7) + (avgAccuracy * 0.3));
      const testsCount = userResults.length;

      // Upsert TypingRanking entry
      await prisma.typingRanking.upsert({
        where: { userId },
        update: {
          bestWpm,
          avgAccuracy,
          testsCount,
          score,
          lastTestDate: new Date(),
          rank: 0 // Will be recalculated below
        },
        create: {
          userId,
          bestWpm,
          avgAccuracy,
          testsCount,
          score,
          lastTestDate: new Date(),
          rank: 0
        }
      });

      // Recalculate ALL ranks across all users
      const allRankings = await prisma.typingRanking.findMany({
        orderBy: { score: 'desc' }
      });

      for (let i = 0; i < allRankings.length; i++) {
        await prisma.typingRanking.update({
          where: { id: allRankings[i].id },
          data: { rank: i + 1 }
        });
      }

      const userRank = allRankings.findIndex(r => r.userId === userId) + 1;
      console.log(`✅ Updated TypingRanking for user ${userId}, score: ${score}, rank: ${userRank}/${allRankings.length}`);

    } catch (rankingErr) {
      console.error('⚠️ Error updating TypingRanking (non-critical):', rankingErr);
      // Don't fail the request if ranking update fails
    }

    return res.status(201).json({
      success: true,
      message: 'Typing result saved',
      data: result,
    });
  } catch (err) {
    console.error('Submit typing result error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}

// ─── GET PRACTICE TEXTS ──────────────────────────────────────────────────
// GET /api/typing/practice-texts
async function getPracticeTexts(req, res) {
  try {
    const { difficulty, category, limit = 10 } = req.query;

    const where = { isActive: true };
    if (difficulty) where.difficulty = difficulty.toUpperCase();
    if (category) where.category = category.toUpperCase();

    const texts = await prisma.typingPracticeText.findMany({
      where,
      take: parseInt(limit) || 10,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: texts,
    });
  } catch (err) {
    console.error('Get practice texts error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}

// ─── GET RANDOM PRACTICE TEXT ──────────────────────────────────────────────
// GET /api/typing/practice-text
async function getRandomTypingText(req, res) {
  try {
    const { difficulty } = req.query;

    const where = { isActive: true };
    if (difficulty) {
      where.difficulty = difficulty.toLowerCase();
    }

    const count = await prisma.typingPracticeText.count({ where });
    if (count === 0) {
      return res.status(404).json({ success: false, message: 'No practice texts found' });
    }

    const random = Math.floor(Math.random() * count);
    const text = await prisma.typingPracticeText.findFirst({
      where,
      skip: random,
    });

    return res.status(200).json({
      success: true,
      data: text,
      content: text.content // Added for simpler frontend access as per prompt
    });
  } catch (err) {
    console.error('Get random typing text error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}

// ─── GET USER TYPING HISTORY ─────────────────────────────────────────────
// GET /api/typing/my-history
async function getUserTypingHistory(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const limit = parseInt(req.query.limit) || 50;

    const results = await prisma.typingResult.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
    });

    // Get user's best WPM for comparison
    const bestWpm = results.length > 0 ? Math.max(...results.map(r => r.wpm)) : 0;

    const formattedResults = results.map((result, index) => ({
      id: result.id,
      date: result.date,
      wpm: result.wpm,
      accuracy: result.accuracy,
      durationMinutes: result.durationMinutes,
      difficulty: result.difficulty || 'intermediate',
      isPersonalBest: result.wpm === bestWpm,
      rank: index + 1,
    }));

    return res.status(200).json({
      success: true,
      data: {
        history: formattedResults,
        totalSessions: results.length,
        bestWpm,
        averageWpm: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / results.length) : 0,
        averageAccuracy: results.length > 0 ? parseFloat((results.reduce((sum, r) => sum + r.accuracy, 0) / results.length).toFixed(1)) : 0,
      },
    });
  } catch (err) {
    console.error('Get user typing history error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}

// ─── GENERATE PLACEHOLDER ENTRIES ─────────────────────────────────────────
// POST /api/typing/generate-placeholders
async function generatePlaceholders(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { count = 5 } = req.body;
    const minUsers = Math.min(count, 10);

    // Get or create the TYPING_DOJO leaderboard
    let typingLeaderboard = await prisma.leaderboard.findUnique({
      where: { category: 'TYPING_DOJO' }
    });
    
    if (!typingLeaderboard) {
      typingLeaderboard = await prisma.leaderboard.create({
        data: {
          category: 'TYPING_DOJO',
          title: 'Typing Dojo Masters',
          description: 'Highest WPM in Typing Dojo'
        }
      });
    }

    // Count existing real entries (non-placeholder)
    const realEntriesCount = await prisma.leaderboardEntry.count({
      where: { 
        leaderboardId: typingLeaderboard.id,
        isPlaceholder: false
      }
    });

    // Count existing placeholders
    const existingPlaceholders = await prisma.leaderboardEntry.count({
      where: { 
        leaderboardId: typingLeaderboard.id,
        isPlaceholder: true
      }
    });

    // Only add placeholders if we have fewer than minUsers real entries
    // and we haven't already added placeholders
    if (realEntriesCount >= minUsers || existingPlaceholders > 0) {
      return res.status(200).json({
        success: true,
        message: existingPlaceholders > 0 
          ? 'Placeholders already exist' 
          : 'Enough real users, no placeholders needed',
        data: { added: 0, existingPlaceholders, realEntriesCount }
      });
    }

    // Get current user's score as reference
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { full_name: true, username: true, country: true }
    });

    // Get user's best stats
    const userStats = await prisma.typingResult.aggregate({
      where: { userId },
      _max: { wpm: true },
      _avg: { accuracy: true }
    });

    const userBestWpm = userStats._max.wpm || 30;
    const userAvgAccuracy = userStats._avg.accuracy || 80;
    const userScore = Math.round((userBestWpm * 0.7) + (userAvgAccuracy * 0.3));

    // Generate placeholder names and countries
    const placeholderNames = [
      'Alex M.', 'Sam K.', 'Jordan P.', 'Taylor R.', 'Morgan L.',
      'Casey W.', 'Riley H.', 'Quinn B.', 'Avery N.', 'Skyler D.'
    ];
    const countries = ['USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'India', 'Brazil', 'Spain'];

    // Create placeholder entries with scores below user's score
    const placeholdersToAdd = minUsers - realEntriesCount;
    const created = [];

    for (let i = 0; i < placeholdersToAdd; i++) {
      // Generate random score between 20% and 80% of user score
      const scoreRatio = 0.2 + (Math.random() * 0.6);
      const score = Math.round(userScore * scoreRatio);
      const wpm = Math.round(userBestWpm * scoreRatio);
      const accuracy = Math.round(userAvgAccuracy * (0.7 + Math.random() * 0.2));

      // Create a placeholder user (using negative IDs to avoid conflicts)
      const placeholderUserId = -(1000 + i);

      const entry = await prisma.leaderboardEntry.upsert({
        where: {
          leaderboardId_userId: {
            leaderboardId: typingLeaderboard.id,
            userId: placeholderUserId
          }
        },
        update: {
          score,
          rank: 0,
          trend: 'stable',
          trendAmount: 0,
          userName: placeholderNames[i] || `User ${i + 1}`,
          userCountry: countries[i % countries.length],
          isPlaceholder: true,
          updatedAt: new Date()
        },
        create: {
          leaderboardId: typingLeaderboard.id,
          userId: placeholderUserId,
          score,
          rank: 0,
          trend: 'stable',
          trendAmount: 0,
          userName: placeholderNames[i] || `User ${i + 1}`,
          userCountry: countries[i % countries.length],
          isPlaceholder: true
        }
      });
      created.push(entry);
    }

    // Recalculate all ranks
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

    console.log(`✅ Generated ${created.length} placeholder entries`);

    return res.status(201).json({
      success: true,
      message: `Generated ${created.length} placeholder entries`,
      data: { added: created.length, totalEntries: allEntries.length }
    });

  } catch (err) {
    console.error('Generate placeholders error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}

// ─── REMOVE BEATEN PLACEHOLDERS ───────────────────────────────────────────
// Helper function to remove placeholders when real users beat them
async function removeBeatenPlaceholders(leaderboardId, userScore) {
  try {
    // Find all placeholders with score less than or equal to userScore
    const beatenPlaceholders = await prisma.leaderboardEntry.findMany({
      where: {
        leaderboardId: leaderboardId,
        isPlaceholder: true,
        score: { lte: userScore }
      }
    });

    if (beatenPlaceholders.length === 0) return { removed: 0 };

    // Delete the beaten placeholders
    await prisma.leaderboardEntry.deleteMany({
      where: {
        id: { in: beatenPlaceholders.map(p => p.id) }
      }
    });

    console.log(`🗑️ Removed ${beatenPlaceholders.length} beaten placeholder(s)`);
    return { removed: beatenPlaceholders.length };
  } catch (err) {
    console.error('Error removing placeholders:', err);
    return { removed: 0, error: err.message };
  }
}

module.exports = {
  getLeaderboard,
  submitTypingResult,
  getPracticeTexts,
  getRandomTypingText,
  getUserTypingHistory,
  generatePlaceholders,
  removeBeatenPlaceholders
};
