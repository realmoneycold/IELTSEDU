const prisma = require('../models/prisma');
const bcrypt = require('bcryptjs');

// ═══════════════════════════════════════════════════════════════
// IELTS LEADERBOARD
// ═══════════════════════════════════════════════════════════════

// GET /api/ielts/leaderboard - Get IELTS band score leaderboard
async function getIELTSLeaderboard(req, res) {
  try {
    let { limit = 100 } = req.query;
    limit = parseInt(limit) || 100;
    if (limit > 200) limit = 200;
    
    const userId = req.user?.id;
    
    // Get all students with valid band scores, ordered by current_band desc
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
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
      take: limit
    });
    
    // Transform to leaderboard format
    const leaderboard = students.map((student, index) => ({
      rank: index + 1,
      userId: student.id,
      name: student.full_name || student.username || 'Anonymous',
      username: student.username,
      country: student.country || 'Unknown',
      band: student.current_band.toFixed(1),
      bandScore: student.current_band,
      targetBand: student.target_band,
      tasksCompleted: student.tasks_done || 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username || student.id || index}`
    }));
    
    // Find current user's rank if they're in the list
    let userRank = null;
    if (userId) {
      const userIndex = students.findIndex(s => s.id === userId);
      if (userIndex !== -1) {
        const user = students[userIndex];
        userRank = {
          rank: userIndex + 1,
          band: user.current_band.toFixed(1),
          bandScore: user.current_band,
          tasksCompleted: user.tasks_done || 0,
          totalUsers: students.length
        };
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        leaderboard,
        userRank,
        totalUsers: students.length
      }
    });
    
  } catch (err) {
    console.error('Get IELTS leaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
}

// ═══════════════════════════════════════════════════════════════
// STUDENT PROFILE CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/student/profile - Get current student profile
async function getStudentProfile(req, res) {
  try {
    const studentId = req.user.id;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        full_name: true,
        username: true,
        email: true,
        phone: true,
        country: true,
        test_type: true,
        target_band: true,
        current_band: true,
        study_hours: true,
        tasks_done: true,
        weekly_goal_percent: true,
        is_onboarded: true,
        exam_date: true,
        exam_date_text: true,
        target_band_range: true,
        study_commitment: true,
        referral_source: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        centre: {
          select: {
            id: true,
            name: true,
            city: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Student profile fetched successfully',
      data: student
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
}

// PUT /api/student/profile - Update student profile
async function updateStudentProfile(req, res) {
  try {
    const studentId = req.user.id;
    const {
      full_name, username, phone, test_type, target_band, country,
      exam_date, exam_date_text, target_band_range, study_commitment, referral_source
    } = req.body;
    
    // DEBUG: Log what we received
    console.log(`[updateStudentProfile] User ${studentId} - Received:`, {
      exam_date, exam_date_text, target_band, test_type
    });

    const updateData = {};
    if (full_name !== undefined) {
      updateData.full_name = full_name;
      updateData.name = full_name; // Compatibility field
    }
    if (username !== undefined) updateData.username = username;
    if (phone !== undefined) updateData.phone = phone;
    if (test_type !== undefined) updateData.test_type = test_type;
    
    if (target_band !== undefined) {
      const band = parseFloat(target_band);
      updateData.target_band = band;
      updateData.targetBand = band; // Compatibility field
    }
    
    if (country !== undefined) updateData.country = country;
    
    if (exam_date !== undefined || exam_date_text !== undefined) {
      const dateVal = exam_date || exam_date_text;
      if (dateVal) {
        const parsedDate = new Date(dateVal);
        if (!isNaN(parsedDate.getTime())) {
          updateData.exam_date = parsedDate;
          updateData.examDate = parsedDate; // Compatibility field
        }
      }
      updateData.exam_date_text = dateVal;
    }
    
    if (target_band_range !== undefined) updateData.target_band_range = target_band_range;
    if (study_commitment !== undefined) updateData.study_commitment = study_commitment;
    if (referral_source !== undefined) updateData.referral_source = referral_source;

    const student = await prisma.user.update({
      where: { id: studentId },
      data: updateData,
      select: {
        id: true,
        full_name: true,
        username: true,
        email: true,
        phone: true,
        country: true,
        test_type: true,
        target_band: true,
        current_band: true,
        exam_date: true,
        exam_date_text: true,
        study_hours: true,
        tasks_done: true,
        updatedAt: true
      }
    });

    // DEBUG: Log what we saved
    console.log(`[updateStudentProfile] User ${studentId} - Saved:`, {
      exam_date: student.exam_date,
      exam_date_text: student.exam_date_text,
      target_band: student.target_band,
      test_type: student.test_type
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
}

// PATCH /api/student/profile/password - Update student password
async function updateStudentPassword(req, res) {
  try {
    const studentId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'currentPassword and newPassword are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters',
        code: 'INVALID_PASSWORD'
      });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: studentId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update student password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password',
      code: 'PASSWORD_UPDATE_ERROR'
    });
  }
}

// POST /api/student/onboarding - Complete onboarding
async function completeOnboarding(req, res) {
  try {
    const studentId = req.user.id;
    const {
      examDate, examDateText, testType,
      targetBandRange, studyCommitment, referralSource
    } = req.body;

    const updateData = {
      is_onboarded: true,
      exam_date: examDate ? new Date(new Date(examDate).toISOString()) : null,
      exam_date_text: examDateText || null,
      test_type: testType || null,
      target_band_range: targetBandRange || null,
      study_commitment: studyCommitment || null,
      referral_source: referralSource || null
    };

    const student = await prisma.user.update({
      where: { id: studentId },
      data: updateData,
      select: {
        id: true,
        full_name: true,
        email: true,
        is_onboarded: true,
        exam_date: true,
        exam_date_text: true,
        test_type: true,
        target_band_range: true,
        study_commitment: true,
        referral_source: true
      }
    });

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: student
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
      code: 'ONBOARDING_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// TYPING PRACTICE CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/student/typing - Get typing history
async function getTypingHistory(req, res) {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 20, from, to } = req.query;

    const where = { userId: studentId };

    if (from) {
      where.date = { ...where.date, gte: new Date(from) };
    }
    if (to) {
      where.date = { ...where.date, lte: new Date(to) };
    }

    const [results, total] = await Promise.all([
      prisma.typingResult.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.typingResult.count({ where })
    ]);

    // Calculate stats
    const bestWpm = results.length > 0 ? Math.max(...results.map(r => r.wpm)) : 0;
    const avgAccuracy = results.length > 0
      ? results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
      : 0;

    res.json({
      success: true,
      data: {
        results,
        stats: {
          bestWpm,
          avgAccuracy: avgAccuracy.toFixed(2),
          totalTests: total
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get typing history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch typing history',
      code: 'TYPING_HISTORY_ERROR'
    });
  }
}

// POST /api/student/typing - Save typing result
async function saveTypingResult(req, res) {
  try {
    const studentId = req.user.id;
    const { wpm, accuracy, durationMinutes } = req.body;

    // Validation
    if (typeof wpm !== 'number' || typeof accuracy !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'wpm and accuracy must be numbers',
        code: 'INVALID_DATA'
      });
    }

    if (wpm < 0 || accuracy < 0 || accuracy > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wpm or accuracy values',
        code: 'INVALID_VALUES'
      });
    }

    const result = await prisma.typingResult.create({
      data: {
        userId: studentId,
        wpm,
        accuracy,
        durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : 2
      }
    });

    // Update student's study hours
    const hoursToAdd = (result.durationMinutes || 2) / 60;
    await prisma.user.update({
      where: { id: studentId },
      data: {
        study_hours: { increment: hoursToAdd }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Typing result saved successfully',
      data: result
    });
  } catch (error) {
    console.error('Save typing result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save typing result',
      code: 'TYPING_SAVE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// STUDY STREAK CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/student/streak - Get study streak info
async function getStudyStreak(req, res) {
  try {
    const studentId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streaks = await prisma.studyStreak.findMany({
      where: { userId: studentId },
      orderBy: { date: 'desc' },
      take: 30
    });

    // Calculate current streak
    let currentStreak = 0;
    let dateCursor = new Date(today);

    for (const streak of streaks) {
      const streakDate = new Date(streak.date);
      streakDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((dateCursor - streakDate) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        if (streak.isCompleted) {
          currentStreak++;
          dateCursor = streakDate;
        }
      } else {
        break;
      }
    }

    // Check if today is completed
    const todayStreak = streaks.find(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    res.json({
      success: true,
      data: {
        currentStreak,
        todayCompleted: todayStreak?.isCompleted || false,
        recentStreaks: streaks.slice(0, 7)
      }
    });
  } catch (error) {
    console.error('Get study streak error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch study streak',
      code: 'STREAK_ERROR'
    });
  }
}

// POST /api/student/streak - Mark today's study as complete
async function markStudyComplete(req, res) {
  try {
    const studentId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already marked
    const existing = await prisma.studyStreak.findFirst({
      where: {
        userId: studentId,
        date: today
      }
    });

    if (existing) {
      if (existing.isCompleted) {
        return res.json({
          success: true,
          message: 'Already marked for today',
          data: existing
        });
      }

      const updated = await prisma.studyStreak.update({
        where: { id: existing.id },
        data: { isCompleted: true }
      });

      // Update tasks done
      await prisma.user.update({
        where: { id: studentId },
        data: { tasks_done: { increment: 1 } }
      });

      return res.json({
        success: true,
        message: 'Study marked as complete',
        data: updated
      });
    }

    // Create new streak record
    const streak = await prisma.studyStreak.create({
      data: {
        userId: studentId,
        date: today,
        isCompleted: true
      }
    });

    // Update tasks done
    await prisma.user.update({
      where: { id: studentId },
      data: { tasks_done: { increment: 1 } }
    });

    res.json({
      success: true,
      message: 'Study marked as complete',
      data: streak
    });
  } catch (error) {
    console.error('Mark study complete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark study as complete',
      code: 'STREAK_COMPLETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY PROGRESS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/student/weekly-progress - Get weekly progress
async function getWeeklyProgress(req, res) {
  try {
    const studentId = req.user.id;

    // Get start of current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const progress = await prisma.weeklyProgress.findMany({
      where: { userId: studentId },
      orderBy: { weekStartDate: 'desc' },
      take: 12 // Last 12 weeks
    });

    res.json({
      success: true,
      data: {
        currentWeek: progress.find(p => p.weekStartDate.getTime() === startOfWeek.getTime()),
        history: progress
      }
    });
  } catch (error) {
    console.error('Get weekly progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly progress',
      code: 'WEEKLY_PROGRESS_ERROR'
    });
  }
}

// PUT /api/student/weekly-progress - Update weekly progress
async function updateWeeklyProgress(req, res) {
  try {
    const studentId = req.user.id;
    const { perfectScoresCount, progressPercentage } = req.body;

    // Get start of current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const progress = await prisma.weeklyProgress.upsert({
      where: {
        userId_weekStartDate: {
          userId: studentId,
          weekStartDate: startOfWeek
        }
      },
      update: {
        perfectScoresCount: parseInt(perfectScoresCount) || 0,
        progressPercentage: parseFloat(progressPercentage) || 0
      },
      create: {
        userId: studentId,
        weekStartDate: startOfWeek,
        perfectScoresCount: parseInt(perfectScoresCount) || 0,
        progressPercentage: parseFloat(progressPercentage) || 0
      }
    });

    res.json({
      success: true,
      message: 'Weekly progress updated',
      data: progress
    });
  } catch (error) {
    console.error('Update weekly progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update weekly progress',
      code: 'WEEKLY_PROGRESS_UPDATE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// MOCK TEST RESULTS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/student/mock-results - Get mock test results
async function getMockResults(req, res) {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const [results, total] = await Promise.all([
      prisma.mockResult.findMany({
        where: { studentId },
        include: {
          session: {
            select: {
              id: true,
              dateTime: true,
              type: true,
              format: true,
              location: true,
              centre: {
                select: {
                  id: true,
                  name: true,
                  city: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.mockResult.count({ where: { studentId } })
    ]);

    // Calculate average scores
    const avgScores = results.length > 0 ? {
      listening: results.filter(r => r.listening).reduce((sum, r) => sum + r.listening, 0) / results.filter(r => r.listening).length || 0,
      reading: results.filter(r => r.reading).reduce((sum, r) => sum + r.reading, 0) / results.filter(r => r.reading).length || 0,
      writing: results.filter(r => r.writing).reduce((sum, r) => sum + r.writing, 0) / results.filter(r => r.writing).length || 0,
      speaking: results.filter(r => r.speaking).reduce((sum, r) => sum + r.speaking, 0) / results.filter(r => r.speaking).length || 0,
      overall: results.filter(r => r.overall).reduce((sum, r) => sum + r.overall, 0) / results.filter(r => r.overall).length || 0
    } : null;

    res.json({
      success: true,
      data: {
        results,
        averages: avgScores,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get mock results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mock results',
      code: 'MOCK_RESULTS_ERROR'
    });
  }
}

// POST /api/student/mock-results - Save mock test result
async function saveMockResult(req, res) {
  try {
    const studentId = req.user.id;
    const { sessionId, listening, reading, writing, speaking, overall } = req.body;

    const result = await prisma.mockResult.create({
      data: {
        studentId,
        sessionId: sessionId ? parseInt(sessionId) : null,
        listening: listening ? parseFloat(listening) : null,
        reading: reading ? parseFloat(reading) : null,
        writing: writing ? parseFloat(writing) : null,
        speaking: speaking ? parseFloat(speaking) : null,
        overall: overall ? parseFloat(overall) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Mock result saved successfully',
      data: result
    });
  } catch (error) {
    console.error('Save mock result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save mock result',
      code: 'MOCK_RESULT_SAVE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// AI CHAT SESSIONS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/student/ai-chats - Get AI chat history
async function getAiChats(req, res) {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const [chats, total] = await Promise.all([
      prisma.aiChatSession.findMany({
        where: { userId: studentId },
        orderBy: { updatedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.aiChatSession.count({ where: { userId: studentId } })
    ]);

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get AI chats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI chats',
      code: 'AI_CHATS_ERROR'
    });
  }
}

// POST /api/student/ai-chats - Create new AI chat session
async function createAiChat(req, res) {
  try {
    const studentId = req.user.id;
    const { topic } = req.body;

    const chat = await prisma.aiChatSession.create({
      data: {
        userId: studentId,
        topic: topic || 'General',
        messageCount: 0,
        history: []
      }
    });

    res.status(201).json({
      success: true,
      message: 'AI chat session created',
      data: chat
    });
  } catch (error) {
    console.error('Create AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create AI chat',
      code: 'AI_CHAT_CREATE_ERROR'
    });
  }
}

// PUT /api/student/ai-chats/:id - Update AI chat session
async function updateAiChat(req, res) {
  try {
    const chatId = parseInt(req.params.id);
    const studentId = req.user.id;
    const { messageCount, history } = req.body;

    const chat = await prisma.aiChatSession.findFirst({
      where: { id: chatId, userId: studentId }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'CHAT_NOT_FOUND'
      });
    }

    const updateData = {};
    if (messageCount !== undefined) updateData.messageCount = parseInt(messageCount);
    if (history !== undefined) updateData.history = history;

    const updatedChat = await prisma.aiChatSession.update({
      where: { id: chatId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'AI chat session updated',
      data: updatedChat
    });
  } catch (error) {
    console.error('Update AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI chat',
      code: 'AI_CHAT_UPDATE_ERROR'
    });
  }
}

// DELETE /api/student/ai-chats/:id - Delete AI chat session
async function deleteAiChat(req, res) {
  try {
    const chatId = parseInt(req.params.id);
    const studentId = req.user.id;

    const chat = await prisma.aiChatSession.findFirst({
      where: { id: chatId, userId: studentId }
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found',
        code: 'CHAT_NOT_FOUND'
      });
    }

    await prisma.aiChatSession.delete({
      where: { id: chatId }
    });

    res.json({
      success: true,
      message: 'AI chat session deleted'
    });
  } catch (error) {
    console.error('Delete AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete AI chat',
      code: 'AI_CHAT_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// GROUP APPLICATIONS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/student/applications - Get student's group applications
async function getApplications(req, res) {
  try {
    const studentId = req.user.id;

    const applications = await prisma.groupApplication.findMany({
      where: { studentId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            level: true,
            schedule: true,
            status: true,
            centre: {
              select: {
                id: true,
                name: true,
                city: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      code: 'APPLICATIONS_ERROR'
    });
  }
}

// POST /api/student/applications - Apply to a study group
async function createApplication(req, res) {
  try {
    const studentId = req.user.id;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'groupId is required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if group exists
    const group = await prisma.studyGroup.findUnique({
      where: { id: parseInt(groupId) }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Check if already applied
    const existing = await prisma.groupApplication.findFirst({
      where: {
        studentId,
        groupId: parseInt(groupId)
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Already applied to this group',
        code: 'ALREADY_APPLIED'
      });
    }

    const application = await prisma.groupApplication.create({
      data: {
        studentId,
        groupId: parseInt(groupId),
        status: 'PENDING'
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            level: true,
            schedule: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
      code: 'APPLICATION_CREATE_ERROR'
    });
  }
}

// DELETE /api/student/applications/:id - Withdraw application
async function deleteApplication(req, res) {
  try {
    const applicationId = parseInt(req.params.id);
    const studentId = req.user.id;

    const application = await prisma.groupApplication.findFirst({
      where: { id: applicationId, studentId }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Can only withdraw pending applications',
        code: 'CANNOT_WITHDRAW'
      });
    }

    await prisma.groupApplication.delete({
      where: { id: applicationId }
    });

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw application',
      code: 'APPLICATION_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// REPORTS CRUD (for students to report issues)
// ═══════════════════════════════════════════════════════════════

// GET /api/student/reports - Get student's submitted reports
async function getReports(req, res) {
  try {
    const studentId = req.user.id;

    const reports = await prisma.report.findMany({
      where: { studentId },
      include: {
        test: {
          select: {
            id: true,
            title: true,
            testType: true
          }
        },
        question: {
          select: {
            id: true,
            questionText: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      code: 'REPORTS_ERROR'
    });
  }
}

// POST /api/student/reports - Submit a report
async function createReport(req, res) {
  try {
    const studentId = req.user.id;
    const { testId, questionId, type, description } = req.body;

    if (!testId || !description) {
      return res.status(400).json({
        success: false,
        error: 'testId and description are required',
        code: 'MISSING_FIELDS'
      });
    }

    const report = await prisma.report.create({
      data: {
        studentId,
        testId: parseInt(testId),
        questionId: questionId ? parseInt(questionId) : null,
        type: type?.toUpperCase() || 'CONTENT_ERROR',
        description
      }
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      data: report
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit report',
      code: 'REPORT_CREATE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════

// GET /api/student/dashboard-stats - Get comprehensive dashboard stats
async function getDashboardStats(req, res) {
  try {
    const studentId = req.user.id;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        full_name: true,
        target_band: true,
        current_band: true,
        study_hours: true,
        tasks_done: true,
        weekly_goal_percent: true
      }
    });

    // Get today's typing practice
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTyping = await prisma.typingResult.findMany({
      where: {
        userId: studentId,
        date: { gte: today, lt: tomorrow }
      }
    });

    // Get current streak
    const streaks = await prisma.studyStreak.findMany({
      where: { userId: studentId },
      orderBy: { date: 'desc' },
      take: 30
    });

    let currentStreak = 0;
    let dateCursor = new Date(today);
    for (const streak of streaks) {
      const streakDate = new Date(streak.date);
      streakDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((dateCursor - streakDate) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1 && streak.isCompleted) {
        currentStreak++;
        dateCursor = streakDate;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      data: {
        profile: {
          fullName: student.full_name,
          targetBand: student.target_band,
          currentBand: student.current_band,
          bandProgress: student.target_band > 0
            ? ((student.current_band / student.target_band) * 100).toFixed(1)
            : 0
        },
        stats: {
          studyHours: student.study_hours,
          tasksDone: student.tasks_done,
          weeklyGoalPercent: student.weekly_goal_percent,
          currentStreak,
          todayTypingCount: todayTyping.length
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      code: 'STATS_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST PROGRESSION SYSTEM - Save test results & unlock levels
// ═══════════════════════════════════════════════════════════════

// POST /api/student/test-results - Save a practice test result
async function saveTestResult(req, res) {
  try {
    const studentId = req.user.id;
    const {
      testIdentifier,
      testCategory,
      testSubcategory,
      setNumber,
      score,
      bandScore,
      correctAnswers,
      totalQuestions,
      timeSpentSeconds,
      answers,
      isCompleted
    } = req.body;

    // Validation
    if (!testIdentifier || !testCategory || typeof setNumber !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'testIdentifier, testCategory, and setNumber are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        error: 'score must be between 0 and 100',
        code: 'INVALID_SCORE'
      });
    }

    // Upsert the test result
    const result = await prisma.practiceTestResult.upsert({
      where: {
        userId_testIdentifier: {
          userId: studentId,
          testIdentifier: testIdentifier.toLowerCase()
        }
      },
      update: {
        score: parseFloat(score),
        bandScore: bandScore ? parseFloat(bandScore) : null,
        correctAnswers: parseInt(correctAnswers) || 0,
        totalQuestions: parseInt(totalQuestions) || 0,
        timeSpentSeconds: parseInt(timeSpentSeconds) || 0,
        answers: answers || {},
        isCompleted: isCompleted || false,
        completedAt: isCompleted ? new Date() : undefined,
        testCategory,
        testSubcategory: testSubcategory || null,
        setNumber
      },
      create: {
        userId: studentId,
        testIdentifier: testIdentifier.toLowerCase(),
        testCategory,
        testSubcategory: testSubcategory || null,
        setNumber: parseInt(setNumber),
        score: parseFloat(score),
        bandScore: bandScore ? parseFloat(bandScore) : null,
        correctAnswers: parseInt(correctAnswers) || 0,
        totalQuestions: parseInt(totalQuestions) || 0,
        timeSpentSeconds: parseInt(timeSpentSeconds) || 0,
        answers: answers || {},
        isCompleted: isCompleted || false,
        completedAt: isCompleted ? new Date() : null
      }
    });

    // Update unlock status for next level if test was completed with good score
    if (isCompleted && score >= 70) {
      await updateNextUnlock(studentId, testCategory, testSubcategory, setNumber);
    }

    // Update student's study hours
    const hoursToAdd = (timeSpentSeconds || 0) / 3600;
    await prisma.user.update({
      where: { id: studentId },
      data: {
        study_hours: { increment: hoursToAdd }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Test result saved successfully',
      data: result
    });
  } catch (error) {
    console.error('Save test result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save test result',
      code: 'TEST_RESULT_SAVE_ERROR'
    });
  }
}

// Helper: Update next level unlock
async function updateNextUnlock(studentId, category, subcategory, currentSet) {
  try {
    const nextSet = currentSet + 1;
    if (nextSet > 10) return; // Max level reached

    const unlockKey = {
      userId_category_subcategory: {
        userId: studentId,
        category,
        subcategory: subcategory || null
      }
    };

    await prisma.testUnlock.upsert({
      where: unlockKey,
      update: {
        maxUnlockedSet: { increment: 1 }
      },
      create: {
        userId: studentId,
        category,
        subcategory: subcategory || null,
        maxUnlockedSet: nextSet
      }
    });
  } catch (error) {
    console.error('Update next unlock error:', error);
  }
}

// GET /api/student/test-results - Get all test results
async function getTestResults(req, res) {
  try {
    const studentId = req.user.id;
    const { category, subcategory } = req.query;

    const where = { userId: studentId };
    if (category) where.testCategory = category;
    if (subcategory) where.testSubcategory = subcategory;

    const results = await prisma.practiceTestResult.findMany({
      where,
      orderBy: { completedAt: 'desc' }
    });

    // Calculate averages per category
    const averages = {
      listening: calculateAverage(results, 'Listening'),
      reading: calculateAverage(results, 'Reading'),
      writing: calculateAverage(results, 'Writing'),
      speaking: calculateAverage(results, 'Speaking')
    };

    res.json({
      success: true,
      data: {
        results,
        averages,
        summary: {
          totalTests: results.length,
          completedTests: results.filter(r => r.isCompleted).length,
          averageScore: results.length > 0
            ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(2)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test results',
      code: 'TEST_RESULTS_ERROR'
    });
  }
}

// GET /api/student/test-results/:id - Get single test result
async function getTestResult(req, res) {
  try {
    const studentId = req.user.id;
    const resultId = parseInt(req.params.id);

    const result = await prisma.practiceTestResult.findFirst({
      where: { id: resultId, userId: studentId }
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Test result not found',
        code: 'TEST_RESULT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get test result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test result',
      code: 'TEST_RESULT_FETCH_ERROR'
    });
  }
}

// Helper: Calculate average score for a category
function calculateAverage(results, category) {
  const categoryResults = results.filter(r => r.testCategory === category && r.isCompleted);
  if (categoryResults.length === 0) return 0;
  const sum = categoryResults.reduce((acc, r) => acc + r.score, 0);
  return parseFloat((sum / categoryResults.length).toFixed(2));
}

// GET /api/student/test-unlocks - Get unlocked levels
async function getTestUnlocks(req, res) {
  try {
    const studentId = req.user.id;
    const { category } = req.query;

    const where = { userId: studentId };
    if (category) where.category = category;

    const unlocks = await prisma.testUnlock.findMany({
      where
    });

    res.json({
      success: true,
      data: unlocks
    });
  } catch (error) {
    console.error('Get test unlocks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test unlocks',
      code: 'TEST_UNLOCKS_ERROR'
    });
  }
}

// GET /api/student/test-unlocks/check/:category/:subcategory/:setNumber - Check if level is unlocked
async function checkLevelUnlock(req, res) {
  try {
    const studentId = req.user.id;
    const { category, subcategory, setNumber } = req.params;

    const unlock = await prisma.testUnlock.findFirst({
      where: {
        userId: studentId,
        category,
        subcategory: subcategory || null
      }
    });

    // If no unlock record, only set 1 is available
    const maxUnlocked = unlock ? unlock.maxUnlockedSet : 1;
    const isUnlocked = parseInt(setNumber) <= maxUnlocked;

    res.json({
      success: true,
      data: {
        isUnlocked,
        maxUnlockedSet: maxUnlocked,
        requestedSet: parseInt(setNumber)
      }
    });
  } catch (error) {
    console.error('Check level unlock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check level unlock',
      code: 'LEVEL_UNLOCK_ERROR'
    });
  }
}

// POST /api/student/progress-snapshot - Create/update progress snapshot
async function createProgressSnapshot(req, res) {
  try {
    const studentId = req.user.id;
    const { aiConclusion, recommendation, weakAreas, strongAreas } = req.body;

    // Get all test results
    const results = await prisma.practiceTestResult.findMany({
      where: { userId: studentId, isCompleted: true }
    });

    // Calculate averages
    const listeningAvg = calculateAverage(results, 'Listening');
    const readingAvg = calculateAverage(results, 'Reading');
    const writingAvg = calculateAverage(results, 'Writing');
    const speakingAvg = calculateAverage(results, 'Speaking');

    const overallAvg = results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0;

    // Estimate band score (simplified conversion)
    const estimatedBand = overallAvg >= 95 ? 9 :
                          overallAvg >= 90 ? 8.5 :
                          overallAvg >= 85 ? 8 :
                          overallAvg >= 75 ? 7.5 :
                          overallAvg >= 65 ? 7 :
                          overallAvg >= 55 ? 6.5 :
                          overallAvg >= 45 ? 6 :
                          overallAvg >= 35 ? 5.5 : 5;

    // Calculate streak
    const streaks = await prisma.studyStreak.findMany({
      where: { userId: studentId },
      orderBy: { date: 'desc' },
      take: 60
    });

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const streak of streaks) {
      if (streak.isCompleted) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        if (currentStreak === 0) {
          currentStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }
    if (currentStreak === 0) currentStreak = tempStreak;

    // Determine if making progress (compare recent 10 vs older)
    const recentResults = results.slice(0, 10);
    const olderResults = results.slice(10);
    const recentAvg = recentResults.length > 0
      ? recentResults.reduce((sum, r) => sum + r.score, 0) / recentResults.length
      : 0;
    const olderAvg = olderResults.length > 0
      ? olderResults.reduce((sum, r) => sum + r.score, 0) / olderResults.length
      : recentAvg;
    const isMakingProgress = recentAvg >= olderAvg;

    const snapshot = await prisma.progressSnapshot.upsert({
      where: { userId: studentId },
      update: {
        listeningAvg,
        readingAvg,
        writingAvg,
        speakingAvg,
        overallAvg: parseFloat(overallAvg.toFixed(2)),
        estimatedBand,
        testsCompleted: results.length,
        currentStreak,
        bestStreak,
        weakAreas: weakAreas ? JSON.stringify(weakAreas) : null,
        strongAreas: strongAreas ? JSON.stringify(strongAreas) : null,
        aiConclusion: aiConclusion || null,
        recommendation: recommendation || null,
        isMakingProgress,
        snapshotDate: new Date()
      },
      create: {
        userId: studentId,
        listeningAvg,
        readingAvg,
        writingAvg,
        speakingAvg,
        overallAvg: parseFloat(overallAvg.toFixed(2)),
        estimatedBand,
        testsCompleted: results.length,
        currentStreak,
        bestStreak,
        weakAreas: weakAreas ? JSON.stringify(weakAreas) : null,
        strongAreas: strongAreas ? JSON.stringify(strongAreas) : null,
        aiConclusion: aiConclusion || null,
        recommendation: recommendation || null,
        isMakingProgress,
        snapshotDate: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Progress snapshot created successfully',
      data: snapshot
    });
  } catch (error) {
    console.error('Create progress snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create progress snapshot',
      code: 'PROGRESS_SNAPSHOT_ERROR'
    });
  }
}

// GET /api/student/progress-snapshot - Get latest progress snapshot
async function getProgressSnapshot(req, res) {
  try {
    const studentId = req.user.id;

    const snapshot = await prisma.progressSnapshot.findFirst({
      where: { userId: studentId },
      orderBy: { snapshotDate: 'desc' }
    });

    if (!snapshot) {
      return res.json({
        success: true,
        data: null,
        message: 'No progress snapshot available yet'
      });
    }

    res.json({
      success: true,
      data: {
        ...snapshot,
        weakAreas: snapshot.weakAreas ? JSON.parse(snapshot.weakAreas) : [],
        strongAreas: snapshot.strongAreas ? JSON.parse(snapshot.strongAreas) : []
      }
    });
  } catch (error) {
    console.error('Get progress snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress snapshot',
      code: 'PROGRESS_SNAPSHOT_FETCH_ERROR'
    });
  }
}

// GET /api/student/progress/ai-analysis - Get AI-powered progress analysis
async function getAIProgressAnalysis(req, res) {
  try {
    const studentId = req.user.id;

    // Get progress snapshot
    const snapshot = await prisma.progressSnapshot.findFirst({
      where: { userId: studentId },
      orderBy: { snapshotDate: 'desc' }
    });

    // Get recent test results with details
    const recentResults = await prisma.practiceTestResult.findMany({
      where: { userId: studentId, isCompleted: true },
      orderBy: { completedAt: 'desc' },
      take: 20
    });

    // Get previous snapshot for comparison
    const previousSnapshot = await prisma.progressSnapshot.findMany({
      where: { userId: studentId },
      orderBy: { snapshotDate: 'desc' },
      skip: 1,
      take: 1
    });

    const analysis = {
      currentLevel: snapshot?.estimatedBand || 5.0,
      isMakingProgress: snapshot?.isMakingProgress || true,
      strengths: snapshot?.strongAreas ? JSON.parse(snapshot.strongAreas) : [],
      weaknesses: snapshot?.weakAreas ? JSON.parse(snapshot.weakAreas) : [],
      categoryAverages: {
        listening: snapshot?.listeningAvg || 0,
        reading: snapshot?.readingAvg || 0,
        writing: snapshot?.writingAvg || 0,
        speaking: snapshot?.speakingAvg || 0
      },
      recentPerformance: recentResults.slice(0, 5).map(r => ({
        test: r.testIdentifier,
        score: r.score,
        date: r.completedAt
      })),
      trend: previousSnapshot.length > 0
        ? (snapshot?.overallAvg || 0) - (previousSnapshot[0]?.overallAvg || 0)
        : 0,
      recommendation: snapshot?.recommendation || 'Continue practicing all sections evenly',
      aiConclusion: snapshot?.aiConclusion || 'Keep practicing to see improvement trends'
    };

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get AI progress analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI progress analysis',
      code: 'AI_ANALYSIS_ERROR'
    });
  }
}

// GET /api/student/todos - Retrieve student's todo items
async function getTodos(req, res) {
  try {
    const studentId = req.user.id;
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { settings: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const settings = student.settings || {};
    const todos = settings.todos || [];

    res.json({ success: true, data: todos });
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve todos' });
  }
}

// PUT /api/student/todos - Update student's todo items list
async function updateTodos(req, res) {
  try {
    const studentId = req.user.id;
    const { todos } = req.body;

    if (!Array.isArray(todos)) {
      return res.status(400).json({ success: false, error: 'todos must be an array' });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { settings: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const currentSettings = student.settings || {};
    const updatedSettings = { ...currentSettings, todos };

    await prisma.user.update({
      where: { id: studentId },
      data: { settings: updatedSettings }
    });

    res.json({ success: true, message: 'Todos updated successfully', data: todos });
  } catch (error) {
    console.error('Update todos error:', error);
    res.status(500).json({ success: false, error: 'Failed to update todos' });
  }
}

// POST /api/student/todos/generate - Generate AI todo list recommendations based on stats
async function generateAiTodos(req, res) {
  try {
    const studentId = req.user.id;
    const groqService = require('../services/groqService');

    // 1. Gather all student stats
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        target_band: true,
        current_band: true,
        settings: true
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Get all test results for averages
    const results = await prisma.practiceTestResult.findMany({
      where: { userId: studentId, isCompleted: true }
    });

    const categoryAverages = {
      listening: calculateAverage(results, 'Listening'),
      reading: calculateAverage(results, 'Reading'),
      writing: calculateAverage(results, 'Writing'),
      speaking: calculateAverage(results, 'Speaking')
    };

    // Get weakness analysis list
    const weaknessAnalyses = await prisma.weaknessAnalysis.findMany({
      where: { userId: studentId },
      orderBy: { priority: 'desc' },
      take: 5
    });

    const weaknesses = weaknessAnalyses.map(w => w.skillArea.replace(/_/g, ' '));

    // Get typing speed
    const typingResults = await prisma.typingResult.findMany({
      where: { userId: studentId },
      orderBy: { date: 'desc' },
      take: 1
    });
    const typingWpm = typingResults.length > 0 ? typingResults[0].wpm : 0;

    // Compile statistics context object
    const stats = {
      currentBand: student.current_band || 5.0,
      targetBand: student.target_band || 7.0,
      categoryAverages,
      weaknesses,
      typingWpm
    };

    // Return immediately to keep UI responsive and non-blocking
    res.json({
      success: true,
      message: 'AI To-Do recommendation generation started in background'
    });

    // Run the AI generation and database updates in the background
    (async () => {
      try {
        const aiResult = await groqService.generateTodoRecommendations(stats);
        
        if (!aiResult || !Array.isArray(aiResult.todos)) {
          console.error('Background AI todos error: Invalid AI response structure');
          return;
        }

        // Format new AI todo items
        const newAiTodos = aiResult.todos.map((item, idx) => ({
          id: `ai-${Date.now()}-${idx}`,
          task: item.task,
          isDone: false,
          isAi: true,
          createdAt: new Date().toISOString()
        }));

        // Fetch fresh student settings in case they updated during generation
        const freshStudent = await prisma.user.findUnique({
          where: { id: studentId },
          select: { settings: true }
        });

        const currentSettings = (freshStudent && freshStudent.settings) || {};
        const existingTodos = currentSettings.todos || [];

        // Filter out previous incomplete AI todos to avoid cluttering, but keep manual ones
        const manualAndDoneTodos = existingTodos.filter(t => !t.isAi || t.isDone);
        const mergedTodos = [...newAiTodos, ...manualAndDoneTodos];

        const updatedSettings = { ...currentSettings, todos: mergedTodos };

        await prisma.user.update({
          where: { id: studentId },
          data: { settings: updatedSettings }
        });
      } catch (bgError) {
        console.error('Background AI todos generation error:', bgError);
      }
    })();

  } catch (error) {
    console.error('Generate AI todos error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to initiate AI todo recommendations' });
    }
  }
}

module.exports = {
  // Profile CRUD
  getStudentProfile,
  updateStudentProfile,
  updateStudentPassword,
  completeOnboarding,
  // Typing CRUD
  getTypingHistory,
  saveTypingResult,
  // Streak CRUD
  getStudyStreak,
  markStudyComplete,
  // Weekly Progress CRUD
  getWeeklyProgress,
  updateWeeklyProgress,
  // Mock Results CRUD
  getMockResults,
  saveMockResult,
  // AI Chats CRUD
  getAiChats,
  createAiChat,
  updateAiChat,
  deleteAiChat,
  // Applications CRUD
  getApplications,
  createApplication,
  deleteApplication,
  // Reports CRUD
  getReports,
  createReport,
  // Dashboard
  getDashboardStats,
  // Test Progression System
  saveTestResult,
  getTestResults,
  getTestResult,
  getTestUnlocks,
  checkLevelUnlock,
  createProgressSnapshot,
  getProgressSnapshot,
  getAIProgressAnalysis,
  // Leaderboard
  getIELTSLeaderboard,
  // Student Todos
  getTodos,
  updateTodos,
  generateAiTodos
};
