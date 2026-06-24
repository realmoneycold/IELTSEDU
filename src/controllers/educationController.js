// ═══════════════════════════════════════════════════════════════
// educationController.js — Education Centre Stats & Students API
// Provides real data for education centre dashboards
// ═══════════════════════════════════════════════════════════════

'use strict';

const prisma = require('../models/prisma');

// ─── GET /api/education/stats ────────────────────────────────────────────────
/**
 * Returns aggregated statistics for the authenticated education centre.
 * Populates the dashboard.html stat cards (students, courses, completion).
 *
 * Auth: CENTRE role required (centreId on JWT payload)
 */
async function getEducationStats(req, res) {
  try {
    const centreId = req.user.centreId;

    if (!centreId) {
      return res.status(403).json({
        success: false,
        error: 'Centre ID not found on token – ensure you are logged in as a centre account',
        code: 'NO_CENTRE_ID'
      });
    }

    // Run all DB queries in parallel for performance
    const [
      centre,
      totalStudents,
      activeStudents,
      totalGroups,
      openGroups,
      totalSessions,
      upcomingSessions,
      totalInquiries,
      unreadInquiries,
      recentResults
    ] = await Promise.all([
      // Centre profile
      prisma.educationCentre.findUnique({
        where: { id: centreId },
        select: { id: true, name: true, code: true, city: true, rating: true }
      }),

      // Students enrolled at this centre (role = STUDENT, same centreId)
      prisma.user.count({
        where: { centreId, role: 'STUDENT' }
      }),

      // Active students (seen in last 30 days)
      prisma.user.count({
        where: {
          centreId,
          role: 'STUDENT',
          lastSeenAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      }),

      // Total study groups / "courses"
      prisma.studyGroup.count({ where: { centreId } }),

      // Open study groups
      prisma.studyGroup.count({ where: { centreId, status: 'OPEN' } }),

      // Total mock exam sessions
      prisma.mockSession.count({ where: { centreId } }),

      // Upcoming sessions
      prisma.mockSession.count({
        where: { centreId, dateTime: { gte: new Date() } }
      }),

      // Total inquiries
      prisma.inquiry.count({ where: { centreId } }),

      // Unread inquiries
      prisma.inquiry.count({ where: { centreId, isRead: false } }),

      // Mock exam results linked to this centre's sessions (for avg score)
      prisma.mockResult.findMany({
        where: {
          session: { centreId }
        },
        select: { overall: true },
        take: 200
      })
    ]);

    // Compute average exam score
    const scoresWithValue = recentResults.filter(r => r.overall != null);
    const avgScore =
      scoresWithValue.length > 0
        ? scoresWithValue.reduce((sum, r) => sum + r.overall, 0) / scoresWithValue.length
        : 0;

    // Completion rate (active / total students)
    const completionRate =
      totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

    res.json({
      success: true,
      data: {
        centre,
        stats: {
          students: {
            total: totalStudents,
            active: activeStudents,
            inactive: totalStudents - activeStudents,
            completionRate            // % active in last 30 days
          },
          courses: {
            total: totalGroups,         // study groups = "courses"
            open: openGroups,
            closed: totalGroups - openGroups
          },
          examSessions: {
            total: totalSessions,
            upcoming: upcomingSessions
          },
          inquiries: {
            total: totalInquiries,
            unread: unreadInquiries
          },
          performance: {
            avgBandScore: parseFloat(avgScore.toFixed(2)),
            resultsCount: recentResults.length
          }
        }
      }
    });
  } catch (error) {
    console.error('getEducationStats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch education centre statistics',
      code: 'STATS_ERROR'
    });
  }
}

// ─── GET /api/education/students ─────────────────────────────────────────────
/**
 * Returns a paginated list of students enrolled at the authenticated centre.
 * Supports search, sorting and filtering by activity.
 *
 * Query params:
 *   page   (int, default 1)
 *   limit  (int, default 20)
 *   search (string) – matches full_name or email
 *   active (boolean string) – 'true' | 'false'
 */
async function getStudentList(req, res) {
  try {
    const centreId = req.user.centreId;

    if (!centreId) {
      return res.status(403).json({
        success: false,
        error: 'Centre ID missing from token',
        code: 'NO_CENTRE_ID'
      });
    }

    const { page = 1, limit = 20, search = '', active = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      centreId,
      role: 'STUDENT'
    };

    // Search filter
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } }
      ];
    }

    // Activity filter
    if (active === 'true') {
      where.lastSeenAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (active === 'false') {
      where.OR = [
        { lastSeenAt: null },
        { lastSeenAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
      ];
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id:           true,
          full_name:    true,
          email:        true,
          phone:        true,
          country:      true,
          current_band: true,
          target_band:  true,
          study_hours:  true,
          tasks_done:   true,
          isActive:     true,
          lastSeenAt:   true,
          createdAt:    true,
          _count: {
            select: {
              mockResults:  true,
              applications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        students,
        pagination: {
          page:  parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('getStudentList error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student list',
      code: 'STUDENTS_FETCH_ERROR'
    });
  }
}

module.exports = {
  getEducationStats,
  getStudentList
};
