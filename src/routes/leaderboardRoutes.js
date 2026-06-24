/**
 * Leaderboard Routes
 * Handles global, national, and friends rankings
 */

const express = require('express');
const router = express.Router();
const prisma = require('../models/prisma');
const { verifyToken } = require('../middleware/auth');

/**
 * GET /api/leaderboard/global
 * Get global leaderboard rankings
 */
router.get('/global', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get users sorted by current_band (descending) and tasks_done
    const users = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        is_verified: true,
        current_band: { gt: 0 }
      },
      select: {
        id: true,
        full_name: true,
        username: true,
        country: true,
        current_band: true,
        target_band: true,
        tasks_done: true,
      },
      orderBy: [
        { current_band: 'desc' },
        { tasks_done: 'desc' }
      ],
      take: limit,
      skip: offset
    });
    
    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: {
        role: 'STUDENT',
        is_verified: true,
        current_band: { gt: 0 }
      }
    });
    
    // Format the response with rankings
    const formattedUsers = users.map((user, index) => ({
      rank: offset + index + 1,
      id: user.id,
      name: user.full_name,
      username: user.username,
      country: user.country || 'Unknown',
      band: user.current_band,
      targetBand: user.target_band,
      testsTaken: user.tasks_done || 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || user.id}`
    }));
    
    res.json({
      success: true,
      data: {
        rankings: formattedUsers,
        totalCount,
        hasMore: offset + users.length < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching global leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
});

/**
 * GET /api/leaderboard/national
 * Get national leaderboard rankings (filtered by user's country or requested country)
 */
router.get('/national', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const requestedCountry = req.query.country;
    
    let countryToFilter = requestedCountry;

    if (!countryToFilter) {
      // Get current user's country if no country requested
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { country: true }
      });
      countryToFilter = currentUser?.country;
    }
    
    if (!countryToFilter) {
      return res.status(400).json({
        success: false,
        message: 'Country not specified and user country not set'
      });
    }
    
    // Get users from the requested country
    const users = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        is_verified: true,
        current_band: { gt: 0 },
        country: countryToFilter
      },
      select: {
        id: true,
        full_name: true,
        username: true,
        country: true,
        current_band: true,
        target_band: true,
        tasks_done: true,
      },
      orderBy: [
        { current_band: 'desc' },
        { tasks_done: 'desc' }
      ],
      take: limit,
      skip: offset
    });
    
    // Get total count
    const totalCount = await prisma.user.count({
      where: {
        role: 'STUDENT',
        is_verified: true,
        current_band: { gt: 0 },
        country: countryToFilter
      }
    });
    
    const formattedUsers = users.map((user, index) => ({
      rank: offset + index + 1,
      id: user.id,
      name: user.full_name,
      username: user.username,
      country: user.country || 'Unknown',
      band: user.current_band,
      targetBand: user.target_band,
      testsTaken: user.tasks_done || 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || user.id}`
    }));
    
    res.json({
      success: true,
      data: {
        rankings: formattedUsers,
        country: countryToFilter,
        totalCount,
        hasMore: offset + users.length < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching national leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch national leaderboard',
      error: error.message
    });
  }
});

/**
 * GET /api/leaderboard/friends
 * Get friends leaderboard (placeholder - coming soon)
 */
router.get('/friends', verifyToken, async (req, res) => {
  res.json({
    success: false,
    message: 'Friends leaderboard - Coming soon!',
    data: {
      rankings: [],
      totalCount: 0,
      hasMore: false
    }
  });
});

/**
 * GET /api/leaderboard/category/:category
 * Get rankings for a specific category (HIGHEST_SCORER, TYPING_DOJO, STUDY_STREAK, WEEKLY_TEST)
 */
router.get('/category/:category', verifyToken, async (req, res) => {
  try {
    const { category } = req.params;
    const country = req.query.country;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const validCategories = ['HIGHEST_SCORER', 'TYPING_DOJO', 'STUDY_STREAK', 'WEEKLY_TEST'];
    const categoryUpper = category.toUpperCase();
    
    if (!validCategories.includes(categoryUpper)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }
    
    // Special handling for TYPING_DOJO - query from TypingRanking table
    if (categoryUpper === 'TYPING_DOJO') {
      console.log('[API] Fetching TYPING_DOJO rankings from TypingRanking table...');
      
      // Get all rankings from the dedicated table with user info
      let rankings = await prisma.typingRanking.findMany({
        orderBy: { score: 'desc' },
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
      
      console.log(`[API] Found ${rankings.length} rankings in TypingRanking table`);

      // Filter by country if requested
      if (country) {
        rankings = rankings.filter(r => r.user?.country?.toLowerCase() === country.toLowerCase());
      }

      // Get total count before pagination
      const totalCount = rankings.length;

      // Apply pagination
      const paginated = rankings.slice(offset, offset + limit);

      // Format for response
      const formattedRankings = paginated.map((r, index) => ({
        rank: r.rank || (offset + index + 1),
        id: r.userId,
        name: r.user?.full_name || r.user?.username || 'Anonymous',
        username: r.user?.username,
        country: r.user?.country || 'Unknown',
        score: r.score,
        wpm: r.bestWpm,
        accuracy: r.avgAccuracy,
        testsTaken: r.testsCount,
        isPlaceholder: false,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.user?.username || r.userId}`,
        trend: 'stable',
        trendAmount: '0'
      }));

      console.log(`[API] Returning ${formattedRankings.length} formatted rankings (paginated)`);
      formattedRankings.forEach(r => {
        console.log(`[API]   - Rank #${r.rank}: ${r.name} (ID=${r.id}, Score=${r.score})`);
      });

      return res.json({
        success: true,
        data: {
          rankings: formattedRankings,
          totalCount,
          hasMore: offset + paginated.length < totalCount
        }
      });
    }
    
    // For other categories, use the pre-calculated leaderboard
    const leaderboard = await prisma.leaderboard.findUnique({
      where: { category: categoryUpper },
      include: {
        entries: {
          where: country ? { userCountry: country } : {},
          orderBy: { rank: 'asc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                username: true,
                country: true,
                current_band: true,
                tasks_done: true
              }
            }
          }
        }
      }
    });
    
    if (!leaderboard) {
      return res.json({
        success: true,
        data: {
          rankings: [],
          totalCount: 0,
          hasMore: false
        }
      });
    }
    
    const totalCount = await prisma.leaderboardEntry.count({
      where: {
        leaderboardId: leaderboard.id,
        ...(country ? { userCountry: country } : {})
      }
    });
    
    const formattedRankings = leaderboard.entries.map(entry => ({
      rank: entry.rank,
      id: entry.userId,
      name: entry.userName || entry.user.full_name,
      username: entry.user.username,
      country: entry.userCountry || entry.user.country || 'Unknown',
      band: entry.user.current_band,
      score: entry.score,
      testsTaken: entry.user.tasks_done,
      trend: entry.trend,
      trendAmount: entry.trendAmount,
      avatar: entry.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.user.username || entry.userId}`
    }));
    
    res.json({
      success: true,
      data: {
        rankings: formattedRankings,
        totalCount,
        hasMore: offset + leaderboard.entries.length < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching category leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category leaderboard',
      error: error.message
    });
  }
});

/**
 * GET /api/leaderboard/podium
 * Get top 3 users for the podium display
 */
router.get('/podium', verifyToken, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        is_verified: true,
        current_band: { gt: 0 }
      },
      select: {
        id: true,
        full_name: true,
        username: true,
        country: true,
        current_band: true,
        target_band: true,
        tasks_done: true,
      },
      orderBy: [
        { current_band: 'desc' },
        { tasks_done: 'desc' }
      ],
      take: 3
    });
    
    // Format for podium (1st, 2nd, 3rd)
    const podiumOrder = [1, 0, 2]; // Reorder to: 2nd, 1st, 3rd for visual display
    const formattedUsers = podiumOrder.map((index, position) => {
      const user = users[index];
      if (!user) return null;
      
      return {
        position: position + 1, // 1, 2, 3
        rank: index + 1, // Actual rank number
        id: user.id,
        name: user.full_name,
        username: user.username,
        country: user.country || 'Unknown',
        band: user.current_band,
        targetBand: user.target_band,
        testsTaken: user.tasks_done || 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || user.id}`
      };
    }).filter(Boolean);
    
    res.json({
      success: true,
      data: {
        podium: formattedUsers
      }
    });
    
  } catch (error) {
    console.error('Error fetching podium:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch podium',
      error: error.message
    });
  }
});

module.exports = router;
