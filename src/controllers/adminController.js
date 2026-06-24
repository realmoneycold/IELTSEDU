const prisma = require('../models/prisma');
const bcrypt = require('bcryptjs');

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/users - List all users with pagination and filtering
async function getAllUsers(req, res) {
  try {
    const { page = 1, limit = 20, search = '', role = '', isActive = '' } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role.toUpperCase();
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          full_name: true,
          email: true,
          country: true,
          phone: true,
          role: true,
          is_verified: true,
          isActive: true,
          current_band: true,
          target_band: true,
          study_hours: true,
          tasks_done: true,
          createdAt: true,
          updatedAt: true,
          lastSeenAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      code: 'USERS_FETCH_ERROR'
    });
  }
}

// GET /api/admin/users/:id - Get single user with full details
async function getUserById(req, res) {
  try {
    const userId = parseInt(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        typingResults: {
          orderBy: { date: 'desc' },
          take: 10
        },
        studyStreaks: {
          orderBy: { date: 'desc' },
          take: 30
        },
        mockResults: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        applications: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                centre: {
                  select: { name: true, city: true }
                }
              }
            }
          }
        },
        centre: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Remove sensitive data
    const { password, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      code: 'USER_FETCH_ERROR'
    });
  }
}

// POST /api/admin/users - Create new user
async function createUser(req, res) {
  try {
    const {
      full_name, email, password, role, country, phone,
      current_band, target_band, centreId
    } = req.body;

    // Validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'full_name, email, password, and role are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Validate role
    const validRoles = ['STUDENT', 'TEACHER', 'CENTRE', 'ADMIN', 'CEO', 'GRADER', 'SUPPORT', 'CONTENT', 'ANALYST', 'MANAGER'];
    const userRole = role.toUpperCase();
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        code: 'INVALID_ROLE'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        full_name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: userRole,
        country: country || null,
        phone: phone || null,
        current_band: parseFloat(current_band) || 5.0,
        target_band: parseFloat(target_band) || 7.0,
        centreId: centreId ? parseInt(centreId) : null,
        is_verified: true, // Admin-created accounts are pre-verified
        is_onboarded: true
      },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        country: true,
        phone: true,
        current_band: true,
        target_band: true,
        is_verified: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      code: 'USER_CREATE_ERROR'
    });
  }
}

// PUT /api/admin/users/:id - Update user
async function updateUser(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const {
      full_name, country, phone, current_band, target_band,
      study_hours, tasks_done, centreId, isActive
    } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (country !== undefined) updateData.country = country;
    if (phone !== undefined) updateData.phone = phone;
    if (current_band !== undefined) updateData.current_band = parseFloat(current_band);
    if (target_band !== undefined) updateData.target_band = parseFloat(target_band);
    if (study_hours !== undefined) updateData.study_hours = parseFloat(study_hours);
    if (tasks_done !== undefined) updateData.tasks_done = parseInt(tasks_done);
    if (centreId !== undefined) updateData.centreId = centreId ? parseInt(centreId) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    updateData.updatedAt = new Date();

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        full_name: true,
        email: true,
        country: true,
        phone: true,
        role: true,
        current_band: true,
        target_band: true,
        study_hours: true,
        tasks_done: true,
        centreId: true,
        isActive: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      code: 'USER_UPDATE_ERROR'
    });
  }
}

// DELETE /api/admin/users/:id - Delete user
async function deleteUser(req, res) {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent deleting admin accounts
    if (existing.role === 'ADMIN' || existing.role === 'CEO') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete admin or CEO accounts',
        code: 'PROTECTED_USER'
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      code: 'USER_DELETE_ERROR'
    });
  }
}

// PATCH /api/admin/users/:id/reset-password - Admin reset password
async function resetUserPassword(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
        code: 'INVALID_PASSWORD'
      });
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      code: 'PASSWORD_RESET_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// EDUCATION CENTRES CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/centres - List all education centres
async function getAllCentres(req, res) {
  try {
    const { page = 1, limit = 20, search = '', city = '', isActive = '' } = req.query;

    const where = { isActive: isActive === '' ? true : isActive === 'true' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    const [centres, total] = await Promise.all([
      prisma.educationCentre.findMany({
        where,
        include: {
          staff: {
            select: {
              id: true,
              full_name: true,
              email: true,
              role: true
            }
          },
          _count: {
            select: {
              mockSessions: true,
              studyGroups: true,
              inquiries: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.educationCentre.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        centres,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get centres error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch centres',
      code: 'CENTRES_FETCH_ERROR'
    });
  }
}

// GET /api/admin/centres/:id - Get single centre
async function getCentreById(req, res) {
  try {
    const centreId = parseInt(req.params.id);

    const centre = await prisma.educationCentre.findUnique({
      where: { id: centreId },
      include: {
        staff: {
          select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            phone: true,
            lastSeenAt: true
          }
        },
        mockSessions: {
          orderBy: { dateTime: 'desc' },
          take: 10
        },
        studyGroups: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        inquiries: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        error: 'Centre not found',
        code: 'CENTRE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: centre
    });
  } catch (error) {
    console.error('Get centre by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch centre',
      code: 'CENTRE_FETCH_ERROR'
    });
  }
}

// POST /api/admin/centres - Create new education centre
async function createCentre(req, res) {
  try {
    const {
      name, code, city, district, address,
      contactEmail, contactPhone, websiteUrl
    } = req.body;

    // Validation
    if (!name || !code || !city) {
      return res.status(400).json({
        success: false,
        error: 'name, code, and city are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if code already exists
    const existing = await prisma.educationCentre.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Centre code already exists',
        code: 'CODE_EXISTS'
      });
    }

    const centre = await prisma.educationCentre.create({
      data: {
        name,
        code: code.toUpperCase(),
        city,
        district: district || null,
        address: address || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        websiteUrl: websiteUrl || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Education centre created successfully',
      data: centre
    });
  } catch (error) {
    console.error('Create centre error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create centre',
      code: 'CENTRE_CREATE_ERROR'
    });
  }
}

// PUT /api/admin/centres/:id - Update education centre
async function updateCentre(req, res) {
  try {
    const centreId = parseInt(req.params.id);
    const {
      name, city, district, address,
      contactEmail, contactPhone, websiteUrl,
      totalStudents, activeStudents, rating, isActive
    } = req.body;

    // Check if centre exists
    const existing = await prisma.educationCentre.findUnique({
      where: { id: centreId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Centre not found',
        code: 'CENTRE_NOT_FOUND'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (address !== undefined) updateData.address = address;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
    if (totalStudents !== undefined) updateData.totalStudents = parseInt(totalStudents);
    if (activeStudents !== undefined) updateData.activeStudents = parseInt(activeStudents);
    if (rating !== undefined) updateData.rating = parseFloat(rating);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const centre = await prisma.educationCentre.update({
      where: { id: centreId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Centre updated successfully',
      data: centre
    });
  } catch (error) {
    console.error('Update centre error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update centre',
      code: 'CENTRE_UPDATE_ERROR'
    });
  }
}

// DELETE /api/admin/centres/:id - Delete education centre
async function deleteCentre(req, res) {
  try {
    const centreId = parseInt(req.params.id);

    // Check if centre exists
    const existing = await prisma.educationCentre.findUnique({
      where: { id: centreId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Centre not found',
        code: 'CENTRE_NOT_FOUND'
      });
    }

    // Check if centre has related data
    const [staffCount, sessionsCount, groupsCount] = await Promise.all([
      prisma.user.count({ where: { centreId } }),
      prisma.mockSession.count({ where: { centreId } }),
      prisma.studyGroup.count({ where: { centreId } })
    ]);

    if (staffCount > 0 || sessionsCount > 0 || groupsCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete centre with associated data. Please remove all related data first.',
        code: 'CENTRE_HAS_DATA',
        details: { staffCount, sessionsCount, groupsCount }
      });
    }

    await prisma.educationCentre.delete({
      where: { id: centreId }
    });

    res.json({
      success: true,
      message: 'Centre deleted successfully'
    });
  } catch (error) {
    console.error('Delete centre error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete centre',
      code: 'CENTRE_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// PRACTICE TESTS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/tests - List all practice tests
async function getAllTests(req, res) {
  try {
    const { page = 1, limit = 20, testType = '', isPublished = '' } = req.query;

    const where = {};

    if (testType) {
      where.testType = testType.toUpperCase();
    }

    if (isPublished !== '') {
      where.isPublished = isPublished === 'true';
    }

    const [tests, total] = await Promise.all([
      prisma.practiceTest.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          },
          questions: {
            orderBy: { orderIndex: 'asc' }
          },
          _count: {
            select: { questions: true, reports: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.practiceTest.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        tests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tests',
      code: 'TESTS_FETCH_ERROR'
    });
  }
}

// GET /api/admin/tests/:id - Get single test with questions
async function getTestById(req, res) {
  try {
    const testId = parseInt(req.params.id);

    const test = await prisma.practiceTest.findUnique({
      where: { id: testId },
      include: {
        createdBy: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        questions: {
          orderBy: { orderIndex: 'asc' }
        },
        reports: {
          include: {
            student: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found',
        code: 'TEST_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('Get test by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test',
      code: 'TEST_FETCH_ERROR'
    });
  }
}

// POST /api/admin/tests - Create new practice test with questions
async function createTest(req, res) {
  try {
    const {
      title, testType, practiceMode, focusArea, durationMins,
      instructions, passage, audioUrl, questions
    } = req.body;

    // Validation
    if (!title || !testType || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'title, testType, and questions array are required',
        code: 'MISSING_FIELDS'
      });
    }

    const createdById = req.user.id;

    const test = await prisma.$transaction(async (tx) => {
      // Create the practice test
      const test = await tx.practiceTest.create({
        data: {
          title,
          testType: testType.toUpperCase(),
          practiceMode: practiceMode?.toUpperCase() || 'FULL',
          focusArea: focusArea || null,
          durationMins: parseInt(durationMins) || 60,
          instructions: instructions || null,
          passage: passage || null,
          audioUrl: audioUrl || null,
          createdById,
          isPublished: false
        }
      });

      // Create all questions
      const questionData = questions.map((q, index) => ({
        testId: test.id,
        questionText: q.questionText,
        type: q.type?.toUpperCase() || 'MULTIPLE_CHOICE',
        options: q.options || null,
        correctAnswer: q.correctAnswer,
        orderIndex: index
      }));

      await tx.question.createMany({
        data: questionData
      });

      return test;
    });

    res.status(201).json({
      success: true,
      message: 'Practice test created successfully',
      data: test
    });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test',
      code: 'TEST_CREATE_ERROR'
    });
  }
}

// PUT /api/admin/tests/:id - Update practice test
async function updateTest(req, res) {
  try {
    const testId = parseInt(req.params.id);
    const {
      title, testType, practiceMode, focusArea, durationMins,
      instructions, passage, audioUrl, isPublished, isArchived
    } = req.body;

    // Check if test exists
    const existing = await prisma.practiceTest.findUnique({
      where: { id: testId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Test not found',
        code: 'TEST_NOT_FOUND'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (testType !== undefined) updateData.testType = testType.toUpperCase();
    if (practiceMode !== undefined) updateData.practiceMode = practiceMode.toUpperCase();
    if (focusArea !== undefined) updateData.focusArea = focusArea;
    if (durationMins !== undefined) updateData.durationMins = parseInt(durationMins);
    if (instructions !== undefined) updateData.instructions = instructions;
    if (passage !== undefined) updateData.passage = passage;
    if (audioUrl !== undefined) updateData.audioUrl = audioUrl;
    if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);
    if (isArchived !== undefined) updateData.isArchived = Boolean(isArchived);

    const test = await prisma.practiceTest.update({
      where: { id: testId },
      data: updateData,
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    res.json({
      success: true,
      message: 'Test updated successfully',
      data: test
    });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update test',
      code: 'TEST_UPDATE_ERROR'
    });
  }
}

// DELETE /api/admin/tests/:id - Delete practice test
async function deleteTest(req, res) {
  try {
    const testId = parseInt(req.params.id);

    // Check if test exists
    const existing = await prisma.practiceTest.findUnique({
      where: { id: testId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Test not found',
        code: 'TEST_NOT_FOUND'
      });
    }

    await prisma.practiceTest.delete({
      where: { id: testId }
    });

    res.json({
      success: true,
      message: 'Test deleted successfully'
    });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete test',
      code: 'TEST_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// QUESTIONS CRUD (individual question management)
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/tests/:testId/questions - List questions for a test
async function getQuestionsByTest(req, res) {
  try {
    const testId = parseInt(req.params.testId);

    const questions = await prisma.question.findMany({
      where: { testId },
      orderBy: { orderIndex: 'asc' }
    });

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions',
      code: 'QUESTIONS_FETCH_ERROR'
    });
  }
}

// POST /api/admin/tests/:testId/questions - Add question to test
async function createQuestion(req, res) {
  try {
    const testId = parseInt(req.params.testId);
    const { questionText, type, options, correctAnswer } = req.body;

    // Validation
    if (!questionText || !correctAnswer) {
      return res.status(400).json({
        success: false,
        error: 'questionText and correctAnswer are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check if test exists
    const test = await prisma.practiceTest.findUnique({
      where: { id: testId }
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found',
        code: 'TEST_NOT_FOUND'
      });
    }

    // Get current max orderIndex
    const maxOrder = await prisma.question.aggregate({
      where: { testId },
      _max: { orderIndex: true }
    });

    const question = await prisma.question.create({
      data: {
        testId,
        questionText,
        type: type?.toUpperCase() || 'MULTIPLE_CHOICE',
        options: options || null,
        correctAnswer,
        orderIndex: (maxOrder._max.orderIndex || 0) + 1
      }
    });

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: question
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create question',
      code: 'QUESTION_CREATE_ERROR'
    });
  }
}

// PUT /api/admin/questions/:id - Update question
async function updateQuestion(req, res) {
  try {
    const questionId = parseInt(req.params.id);
    const { questionText, type, options, correctAnswer, orderIndex } = req.body;

    const existing = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    const updateData = {};
    if (questionText !== undefined) updateData.questionText = questionText;
    if (type !== undefined) updateData.type = type.toUpperCase();
    if (options !== undefined) updateData.options = options;
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer;
    if (orderIndex !== undefined) updateData.orderIndex = parseInt(orderIndex);

    const question = await prisma.question.update({
      where: { id: questionId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: question
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update question',
      code: 'QUESTION_UPDATE_ERROR'
    });
  }
}

// DELETE /api/admin/questions/:id - Delete question
async function deleteQuestion(req, res) {
  try {
    const questionId = parseInt(req.params.id);

    const existing = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Question not found',
        code: 'QUESTION_NOT_FOUND'
      });
    }

    await prisma.question.delete({
      where: { id: questionId }
    });

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete question',
      code: 'QUESTION_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// REPORTS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/reports - List all reports
async function getAllReports(req, res) {
  try {
    const { page = 1, limit = 20, status = '', type = '' } = req.query;

    const where = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (type) {
      where.type = type.toUpperCase();
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          },
          test: {
            select: {
              id: true,
              title: true
            }
          },
          question: {
            select: {
              id: true,
              questionText: true
            }
          },
          resolvedBy: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.report.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      code: 'REPORTS_FETCH_ERROR'
    });
  }
}

// GET /api/admin/reports/:id - Get single report
async function getReportById(req, res) {
  try {
    const reportId = parseInt(req.params.id);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            email: true,
            current_band: true
          }
        },
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
            questionText: true,
            type: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get report by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report',
      code: 'REPORT_FETCH_ERROR'
    });
  }
}

// PATCH /api/admin/reports/:id/resolve - Resolve a report
async function resolveReport(req, res) {
  try {
    const reportId = parseInt(req.params.id);
    const { resolutionNote } = req.body;

    const existing = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        resolvedById: req.user.id,
        resolutionNote: resolutionNote || null,
        resolvedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Report resolved successfully',
      data: report
    });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve report',
      code: 'REPORT_RESOLVE_ERROR'
    });
  }
}

// PATCH /api/admin/reports/:id/status - Update report status
async function updateReportStatus(req, res) {
  try {
    const reportId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['OPEN', 'REVIEWING', 'RESOLVED', 'WONT_FIX'];
    if (!validStatuses.includes(status?.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS'
      });
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status: status.toUpperCase() }
    });

    res.json({
      success: true,
      message: 'Report status updated successfully',
      data: report
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update report status',
      code: 'REPORT_STATUS_ERROR'
    });
  }
}

// DELETE /api/admin/reports/:id - Delete report
async function deleteReport(req, res) {
  try {
    const reportId = parseInt(req.params.id);

    const existing = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await prisma.report.delete({
      where: { id: reportId }
    });

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      code: 'REPORT_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN TASKS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/tasks - Get tasks for current admin
async function getAdminTasks(req, res) {
  try {
    const adminId = req.user.id;
    const { isDone = 'false' } = req.query;

    const where = { adminId };
    if (isDone !== '') {
      where.isDone = isDone === 'true';
    }

    const tasks = await prisma.adminTask.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
    });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    console.error('Get admin tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      code: 'TASKS_FETCH_ERROR'
    });
  }
}

// POST /api/admin/tasks - Create new task for admin
async function createAdminTask(req, res) {
  try {
    const { title, notes, label, priority, assignedDate } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required',
        code: 'MISSING_FIELDS'
      });
    }

    const task = await prisma.adminTask.create({
      data: {
        adminId: req.user.id,
        title,
        notes: notes || null,
        label: label?.toUpperCase() || 'CUSTOMER_SERVICE',
        priority: priority?.toUpperCase() || 'MEDIUM',
        assignedDate: assignedDate ? new Date(new Date(assignedDate).toISOString()) : new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    console.error('Create admin task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      code: 'TASK_CREATE_ERROR'
    });
  }
}

// PATCH /api/admin/tasks/:id/toggle - Toggle task completion
async function toggleTask(req, res) {
  try {
    const taskId = parseInt(req.params.id);

    const existing = await prisma.adminTask.findUnique({
      where: { id: taskId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    const task = await prisma.adminTask.update({
      where: { id: taskId },
      data: {
        isDone: !existing.isDone,
        doneAt: !existing.isDone ? new Date() : null
      }
    });

    res.json({
      success: true,
      message: 'Task toggled successfully',
      data: task
    });
  } catch (error) {
    console.error('Toggle task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle task',
      code: 'TASK_TOGGLE_ERROR'
    });
  }
}

// DELETE /api/admin/tasks/:id - Delete task
async function deleteAdminTask(req, res) {
  try {
    const taskId = parseInt(req.params.id);

    const existing = await prisma.adminTask.findUnique({
      where: { id: taskId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    await prisma.adminTask.delete({
      where: { id: taskId }
    });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
      code: 'TASK_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// STRATEGIC GOALS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/goals - List all strategic goals
async function getAllGoals(req, res) {
  try {
    const { column = '' } = req.query;

    const where = {};
    if (column) {
      where.column = column.toUpperCase();
    }

    const goals = await prisma.strategicGoal.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
    });

    // Group by column
    const grouped = {
      TODO: goals.filter(g => g.column === 'TODO'),
      IN_PROGRESS: goals.filter(g => g.column === 'IN_PROGRESS'),
      DONE: goals.filter(g => g.column === 'DONE')
    };

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch goals',
      code: 'GOALS_FETCH_ERROR'
    });
  }
}

// POST /api/admin/goals - Create new strategic goal
async function createGoal(req, res) {
  try {
    const { title, priority, column, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required',
        code: 'MISSING_FIELDS'
      });
    }

    const goal = await prisma.strategicGoal.create({
      data: {
        title,
        priority: priority?.toUpperCase() || 'MEDIUM',
        column: column?.toUpperCase() || 'TODO',
        dueDate: dueDate ? new Date(new Date(dueDate).toISOString()) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: goal
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create goal',
      code: 'GOAL_CREATE_ERROR'
    });
  }
}

// PATCH /api/admin/goals/:id - Update strategic goal
async function updateGoal(req, res) {
  try {
    const goalId = parseInt(req.params.id);
    const { title, priority, column, dueDate } = req.body;

    const existing = await prisma.strategicGoal.findUnique({
      where: { id: goalId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (priority !== undefined) updateData.priority = priority.toUpperCase();
    if (column !== undefined) updateData.column = column.toUpperCase();
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(new Date(dueDate).toISOString()) : null;

    const goal = await prisma.strategicGoal.update({
      where: { id: goalId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: goal
    });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update goal',
      code: 'GOAL_UPDATE_ERROR'
    });
  }
}

// DELETE /api/admin/goals/:id - Delete strategic goal
async function deleteGoal(req, res) {
  try {
    const goalId = parseInt(req.params.id);

    const existing = await prisma.strategicGoal.findUnique({
      where: { id: goalId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }

    await prisma.strategicGoal.delete({
      where: { id: goalId }
    });

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete goal',
      code: 'GOAL_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS & DASHBOARD
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/stats - Get dashboard statistics
async function getDashboardStats(req, res) {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCentres,
      totalTests,
      openReports,
      pendingTasks
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000)
          }
        }
      }),
      prisma.educationCentre.count({ where: { isActive: true } }),
      prisma.practiceTest.count(),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.adminTask.count({
        where: {
          adminId: req.user.id,
          isDone: false
        }
      })
    ]);

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSignups = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          activeNow: activeUsers,
          recentSignups
        },
        centres: {
          total: totalCentres
        },
        tests: {
          total: totalTests
        },
        reports: {
          open: openReports
        },
        tasks: {
          pending: pendingTasks
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats',
      code: 'STATS_FETCH_ERROR'
    });
  }
}

module.exports = {
  // User CRUD
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  // Centre CRUD
  getAllCentres,
  getCentreById,
  createCentre,
  updateCentre,
  deleteCentre,
  // Test CRUD
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  // Question CRUD
  getQuestionsByTest,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  // Report CRUD
  getAllReports,
  getReportById,
  resolveReport,
  updateReportStatus,
  deleteReport,
  // Task CRUD
  getAdminTasks,
  createAdminTask,
  toggleTask,
  deleteAdminTask,
  // Goal CRUD
  getAllGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  // Analytics
  getDashboardStats
};
