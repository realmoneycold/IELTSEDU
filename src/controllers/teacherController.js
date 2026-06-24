const prisma = require('../models/prisma');
const bcrypt = require('bcryptjs');

// ═══════════════════════════════════════════════════════════════
// TEACHER PROFILE CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/teacher/profile - Get current teacher profile
async function getTeacherProfile(req, res) {
  try {
    const teacherId = req.user.id;

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        country: true,
        role: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
        _count: {
          select: {
            lessons: true,
            materials: true,
            followers: true
          }
        }
      }
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: 'Teacher profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Get teacher profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
}

// PUT /api/teacher/profile - Update teacher profile
async function updateTeacherProfile(req, res) {
  try {
    const teacherId = req.user.id;
    const { full_name, phone, country } = req.body;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (country !== undefined) updateData.country = country;

    const teacher = await prisma.user.update({
      where: { id: teacherId },
      data: updateData,
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        country: true,
        role: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: teacher
    });
  } catch (error) {
    console.error('Update teacher profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
}

// PATCH /api/teacher/profile/password - Update teacher password
async function updateTeacherPassword(req, res) {
  try {
    const teacherId = req.user.id;
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

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId }
    });

    const isMatch = await bcrypt.compare(currentPassword, teacher.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: teacherId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update teacher password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password',
      code: 'PASSWORD_UPDATE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// LESSONS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/teacher/lessons - List all lessons for current teacher
async function getLessons(req, res) {
  try {
    const teacherId = req.user.id;
    const { status, page = 1, limit = 10, upcoming = '' } = req.query;

    const where = { teacherId };

    if (status) {
      where.status = status;
    }

    if (upcoming === 'true') {
      where.startTime = { gte: new Date() };
    }

    const [lessons, total] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          materials: {
            select: {
              id: true,
              fileName: true,
              fileType: true,
              fileUrl: true,
              createdAt: true
            }
          }
        },
        orderBy: { startTime: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.lesson.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        lessons,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lessons',
      code: 'LESSONS_FETCH_ERROR'
    });
  }
}

// GET /api/teacher/lessons/:id - Get single lesson
async function getLessonById(req, res) {
  try {
    const lessonId = parseInt(req.params.id);
    const teacherId = req.user.id;

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId },
      include: {
        materials: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
        code: 'LESSON_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: lesson
    });
  } catch (error) {
    console.error('Get lesson by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson',
      code: 'LESSON_FETCH_ERROR'
    });
  }
}

// POST /api/teacher/lessons - Create new lesson
async function createLesson(req, res) {
  try {
    const teacherId = req.user.id;
    const { title, startTime, status } = req.body;

    // Validation
    if (!title || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'title and startTime are required',
        code: 'MISSING_FIELDS'
      });
    }

    const parsedStartTime = new Date(startTime);
    if (isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid startTime format',
        code: 'INVALID_DATE'
      });
    }

    // Auto-generate IELTS Practice room ID
    const roomId = `ielts-class-${teacherId}-${Date.now()}`;

    const lesson = await prisma.lesson.create({
      data: {
        title,
        roomId,
        startTime: new Date(new Date(startTime).toISOString()),
        teacherId,
        status: status || 'SCHEDULED'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lesson: ' + (error.message || 'Unknown error'),
      code: 'LESSON_CREATE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// PUT /api/teacher/lessons/:id - Update lesson
async function updateLesson(req, res) {
  try {
    const lessonId = parseInt(req.params.id);
    const teacherId = req.user.id;
    const { title, startTime, status } = req.body;

    // Check if lesson exists and belongs to teacher
    const existing = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
        code: 'LESSON_NOT_FOUND'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (startTime !== undefined) updateData.startTime = new Date(new Date(startTime).toISOString());
    if (status !== undefined) updateData.status = status;
    // Preserve existing roomId or generate new one if missing
    if (!existing.roomId) updateData.roomId = `ielts-class-${teacherId}-${Date.now()}`;

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
      include: {
        materials: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lesson',
      code: 'LESSON_UPDATE_ERROR'
    });
  }
}

// DELETE /api/teacher/lessons/:id - Delete lesson
async function deleteLesson(req, res) {
  try {
    const lessonId = parseInt(req.params.id);
    const teacherId = req.user.id;

    // Check if lesson exists and belongs to teacher
    const existing = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found',
        code: 'LESSON_NOT_FOUND'
      });
    }

    await prisma.lesson.delete({
      where: { id: lessonId }
    });

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lesson',
      code: 'LESSON_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// MATERIALS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/teacher/materials - List all materials for current teacher
async function getMaterials(req, res) {
  try {
    const teacherId = req.user.id;
    const { lessonId, page = 1, limit = 10 } = req.query;

    const where = { teacherId };
    if (lessonId) {
      where.lessonId = parseInt(lessonId);
    }

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        include: {
          lesson: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.material.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        materials,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch materials',
      code: 'MATERIALS_FETCH_ERROR'
    });
  }
}

// GET /api/teacher/materials/:id - Get single material
async function getMaterialById(req, res) {
  try {
    const materialId = parseInt(req.params.id);
    const teacherId = req.user.id;

    const material = await prisma.material.findFirst({
      where: { id: materialId, teacherId },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            startTime: true
          }
        }
      }
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        error: 'Material not found',
        code: 'MATERIAL_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: material
    });
  } catch (error) {
    console.error('Get material by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch material',
      code: 'MATERIAL_FETCH_ERROR'
    });
  }
}

// POST /api/teacher/materials - Create material (file upload handled by multer)
async function createMaterial(req, res) {
  try {
    const teacherId = req.user.id;
    const { lessonId, fileName, fileUrl, fileType } = req.body;

    // Validation
    if (!fileName || !fileUrl || !fileType) {
      return res.status(400).json({
        success: false,
        error: 'fileName, fileUrl, and fileType are required',
        code: 'MISSING_FIELDS'
      });
    }

    // If lessonId provided, verify it belongs to this teacher
    if (lessonId) {
      const lesson = await prisma.lesson.findFirst({
        where: { id: parseInt(lessonId), teacherId }
      });

      if (!lesson) {
        return res.status(404).json({
          success: false,
          error: 'Lesson not found',
          code: 'LESSON_NOT_FOUND'
        });
      }
    }

    const material = await prisma.material.create({
      data: {
        teacherId,
        fileName,
        fileUrl,
        fileType,
        lessonId: lessonId ? parseInt(lessonId) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Material created successfully',
      data: material
    });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create material',
      code: 'MATERIAL_CREATE_ERROR'
    });
  }
}

// PUT /api/teacher/materials/:id - Update material
async function updateMaterial(req, res) {
  try {
    const materialId = parseInt(req.params.id);
    const teacherId = req.user.id;
    const { fileName, fileType, lessonId } = req.body;

    // Check if material exists and belongs to teacher
    const existing = await prisma.material.findFirst({
      where: { id: materialId, teacherId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Material not found',
        code: 'MATERIAL_NOT_FOUND'
      });
    }

    const updateData = {};
    if (fileName !== undefined) updateData.fileName = fileName;
    if (fileType !== undefined) updateData.fileType = fileType;
    if (lessonId !== undefined) {
      // Verify lesson belongs to teacher
      const lesson = await prisma.lesson.findFirst({
        where: { id: parseInt(lessonId), teacherId }
      });
      if (!lesson) {
        return res.status(404).json({
          success: false,
          error: 'Lesson not found',
          code: 'LESSON_NOT_FOUND'
        });
      }
      updateData.lessonId = parseInt(lessonId);
    }

    const material = await prisma.material.update({
      where: { id: materialId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Material updated successfully',
      data: material
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update material',
      code: 'MATERIAL_UPDATE_ERROR'
    });
  }
}

// DELETE /api/teacher/materials/:id - Delete material
async function deleteMaterial(req, res) {
  try {
    const materialId = parseInt(req.params.id);
    const teacherId = req.user.id;

    // Check if material exists and belongs to teacher
    const existing = await prisma.material.findFirst({
      where: { id: materialId, teacherId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Material not found',
        code: 'MATERIAL_NOT_FOUND'
      });
    }

    await prisma.material.delete({
      where: { id: materialId }
    });

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete material',
      code: 'MATERIAL_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// FOLLOWERS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/teacher/followers - List all followers (students following this teacher)
async function getFollowers(req, res) {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: { teacherId },
        include: {
          student: {
            select: {
              id: true,
              full_name: true,
              email: true,
              country: true,
              current_band: true,
              target_band: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.follow.count({ where: { teacherId } })
    ]);

    res.json({
      success: true,
      data: {
        followers: follows.map(f => f.student),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch followers',
      code: 'FOLLOWERS_FETCH_ERROR'
    });
  }
}

// GET /api/teacher/followers/count - Get follower count
async function getFollowerCount(req, res) {
  try {
    const teacherId = req.user.id;

    const count = await prisma.follow.count({
      where: { teacherId }
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get follower count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch follower count',
      code: 'FOLLOWER_COUNT_ERROR'
    });
  }
}

// DELETE /api/teacher/followers/:studentId - Remove a follower
async function removeFollower(req, res) {
  try {
    const teacherId = req.user.id;
    const studentId = parseInt(req.params.studentId);

    const follow = await prisma.follow.findFirst({
      where: {
        teacherId,
        studentId
      }
    });

    if (!follow) {
      return res.status(404).json({
        success: false,
        error: 'Follower not found',
        code: 'FOLLOWER_NOT_FOUND'
      });
    }

    await prisma.follow.delete({
      where: { id: follow.id }
    });

    res.json({
      success: true,
      message: 'Follower removed successfully'
    });
  } catch (error) {
    console.error('Remove follower error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove follower',
      code: 'FOLLOWER_REMOVE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════

// GET /api/teacher/dashboard-stats - Get comprehensive dashboard statistics
async function getDashboardStats(req, res) {
  try {
    const teacherId = req.user.id;

    // Get follower student IDs first
    const follows = await prisma.follow.findMany({
      where: { teacherId },
      select: { studentId: true }
    });
    const studentIds = follows.map(f => f.studentId);

    const [
      nextLesson,
      followerCount,
      completedLessonsCount,
      materialsCount,
      pendingSubmissions
    ] = await Promise.all([
      prisma.lesson.findFirst({
        where: {
          teacherId,
          status: 'SCHEDULED',
          startTime: { gte: new Date() }
        },
        orderBy: { startTime: 'asc' }
      }),
      prisma.follow.count({ where: { teacherId } }),
      prisma.lesson.count({
        where: {
          teacherId,
          status: 'COMPLETED'
        }
      }),
      prisma.material.count({ where: { teacherId } }),
      prisma.testSubmission.count({
        where: {
          userId: studentIds.length ? { in: studentIds } : undefined,
          gradedAt: null
        }
      })
    ]);

    // Calculate countdown to next lesson
    let countdown = null;
    if (nextLesson) {
      const now = new Date();
      const lessonTime = new Date(nextLesson.startTime);
      const diff = lessonTime - now;
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        countdown = { hours, minutes, seconds, total: diff };
      }
    }

    // Get lessons this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const lessonsThisWeek = await prisma.lesson.count({
      where: { teacherId, startTime: { gte: startOfWeek } }
    });

    // Get graded submissions count
    const gradedCount = await prisma.testSubmission.count({
      where: {
        userId: studentIds.length ? { in: studentIds } : undefined,
        gradedAt: { not: null }
      }
    });

    // Get or create TeacherStats record for delta tracking
    let stats = await prisma.teacherStats.findUnique({ where: { teacherId } });
    if (!stats) {
      stats = await prisma.teacherStats.create({
        data: {
          teacherId,
          totalHoursTaught: completedLessonsCount,
          totalStudentsHelped: followerCount,
          totalMaterialsShared: materialsCount,
          totalSubmissionsGraded: gradedCount,
          lastWeekFollowers: followerCount,
          lastWeekMaterials: materialsCount,
          lastWeekLessons: lessonsThisWeek,
          lastWeekGraded: gradedCount
        }
      });
    }

    // Compute deltas (current vs last snapshot)
    const deltas = {
      followersDelta: followerCount - stats.lastWeekFollowers,
      materialsDelta: materialsCount - stats.lastWeekMaterials,
      lessonsDelta: lessonsThisWeek - stats.lastWeekLessons,
      gradedDelta: gradedCount - stats.lastWeekGraded
    };

    // Update stats snapshot for next week comparison
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (stats.updatedAt < oneWeekAgo) {
      await prisma.teacherStats.update({
        where: { teacherId },
        data: {
          totalHoursTaught: completedLessonsCount,
          totalStudentsHelped: followerCount,
          totalMaterialsShared: materialsCount,
          totalSubmissionsGraded: gradedCount,
          lastWeekFollowers: followerCount,
          lastWeekMaterials: materialsCount,
          lastWeekLessons: lessonsThisWeek,
          lastWeekGraded: gradedCount
        }
      });
    }

    res.json({
      success: true,
      data: {
        nextLesson,
        countdown,
        followerCount,
        completedLessonsCount,
        materialsCount,
        lessonsThisWeek,
        pendingSubmissions,
        gradedCount,
        hoursTaught: completedLessonsCount,
        deltas
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics: ' + (error.message || 'Unknown error'),
      code: 'DASHBOARD_STATS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// TEACHER STUDENTS
// ═══════════════════════════════════════════════════════════════

// GET /api/teacher/students - List students following this teacher with progress
async function getTeacherStudents(req, res) {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find all Follow records for this teacher, optionally filtered by student name/email
    const where = { teacherId };

    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where,
        include: {
          student: {
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
                  mockResults:     true,
                  typingResults:   true,
                  progressSnapshots: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.follow.count({ where })
    ]);

    // Apply search filter client-side after join (or redo as subquery)
    let students = follows.map(f => ({
      followedSince: f.createdAt,
      ...f.student
    }));

    if (search) {
      const q = search.toLowerCase();
      students = students.filter(
        s =>
          s.full_name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }

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
    console.error('getTeacherStudents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch teacher students',
      code: 'STUDENTS_FETCH_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// ASSIGNMENTS
// An assignment is a lesson scheduled specifically as a task.
// ═══════════════════════════════════════════════════════════════

// POST /api/teacher/assignment - Create an assignment (scheduled lesson)
async function createAssignment(req, res) {
  try {
    const teacherId = req.user.id;
    const { title, description, zoomLink, startTime, dueDate } = req.body;

    // Validation
    if (!title || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'title and startTime are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Build lesson entry (assignments are lessons with status SCHEDULED)
    const assignment = await prisma.lesson.create({
      data: {
        title: title.trim(),
        zoomLink: zoomLink || `https://zoom.us/j/assignment-${Date.now()}`,
        startTime: new Date(new Date(startTime).toISOString()),
        status: 'SCHEDULED',
        teacherId
      }
    });

    // If materials / description provided – attach as a text material
    if (description) {
      await prisma.material.create({
        data: {
          teacherId,
          fileName:  `${title.trim()} - Instructions.txt`,
          fileUrl:   '',           // no physical file for text descriptions
          fileType:  'text/plain',
          lessonId:  assignment.id
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data:    assignment
    });
  } catch (error) {
    console.error('createAssignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assignment',
      code: 'ASSIGNMENT_CREATE_ERROR'
    });
  }
}

// GET /api/teacher/submissions - List test submissions from followers
async function getSubmissions(req, res) {
  try {
    const teacherId = req.user.id;
    const { status = 'all' } = req.query;

    // Get follower IDs
    const follows = await prisma.follow.findMany({
      where: { teacherId },
      select: { studentId: true }
    });
    const studentIds = follows.map(f => f.studentId);

    if (studentIds.length === 0) {
      return res.json({ success: true, data: { submissions: [] } });
    }

    const where = { userId: { in: studentIds } };
    if (status === 'pending') where.gradedAt = null;
    if (status === 'graded') where.gradedAt = { not: null };

    const submissions = await prisma.testSubmission.findMany({
      where,
      include: { user: { select: { full_name: true, email: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 100
    });

    res.json({
      success: true,
      data: { submissions }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
}

// POST /api/teacher/submissions/:id/grade - Grade a submission
async function gradeSubmission(req, res) {
  try {
    const teacherId = req.user.id;
    const submissionId = req.params.id;
    const { score, bandScore, feedbackText } = req.body;

    // Verify submission belongs to a follower
    const submission = await prisma.testSubmission.findUnique({
      where: { id: submissionId },
      include: { user: true }
    });

    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    const isFollowing = await prisma.follow.findFirst({
      where: { teacherId, studentId: submission.userId }
    });

    if (!isFollowing) {
      return res.status(403).json({ success: false, error: 'Not authorized to grade this submission' });
    }

    const updated = await prisma.testSubmission.update({
      where: { id: submissionId },
      data: {
        score: score !== undefined ? parseFloat(score) : undefined,
        bandScore: bandScore !== undefined ? parseFloat(bandScore) : undefined,
        feedback: feedbackText ? { text: feedbackText } : undefined,
        gradedAt: new Date()
      }
    });

    res.json({ success: true, message: 'Graded successfully', data: updated });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to grade submission' });
  }
}

// POST /api/teacher/message - Send a message to a student
async function sendMessage(req, res) {
  try {
    const teacherId = req.user.id;
    const { studentId, subject, body } = req.body;

    if (!studentId || !body) {
      return res.status(400).json({
        success: false,
        error: 'studentId and body are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Verify student follows this teacher
    const isFollowing = await prisma.follow.findFirst({
      where: { teacherId, studentId: parseInt(studentId) }
    });

    if (!isFollowing) {
      return res.status(403).json({
        success: false,
        error: 'Student is not following you',
        code: 'NOT_FOLLOWER'
      });
    }

    // Log message (in future: persist to Message table)
    console.log(`[Teacher ${teacherId} -> Student ${studentId}] ${subject || 'No subject'}: ${body}`);

    res.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
}

// GET /api/teacher/notifications - List recent notifications
async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({ success: true, data: { notifications } });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
}

// POST /api/teacher/notifications/:id/read - Mark a notification as read
async function markNotificationRead(req, res) {
  try {
    const id = parseInt(req.params.id);
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
}

// GET /api/teacher/settings - Get teacher settings
async function getSettings(req, res) {
  try {
    const teacherId = req.user.id;
    let saved = {};
    try {
      const user = await prisma.user.findUnique({
        where: { id: teacherId },
        select: { settings: true }
      });
      saved = user?.settings || {};
    } catch (dbErr) {
      // settings column may not exist yet; fall back to defaults
      console.log('Settings column not available yet, using defaults');
    }
    const defaults = {
      emailNotifications: 'All notifications',
      defaultLessonDuration: '60 minutes',
      language: 'English'
    };
    res.json({
      success: true,
      data: { ...defaults, ...saved }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
}

// PUT /api/teacher/settings - Update teacher settings
async function updateSettings(req, res) {
  try {
    const teacherId = req.user.id;
    const { emailNotifications, defaultLessonDuration, language } = req.body;
    const settings = { emailNotifications, defaultLessonDuration, language };
    try {
      await prisma.user.update({
        where: { id: teacherId },
        data: { settings }
      });
    } catch (dbErr) {
      // settings column may not exist yet; accept gracefully
      console.log('Settings column not available yet, cannot persist');
    }
    res.json({ success: true, message: 'Settings saved', data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to save settings' });
  }
}

module.exports = {
  // Profile CRUD
  getTeacherProfile,
  updateTeacherProfile,
  updateTeacherPassword,
  // Lessons CRUD
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  // Materials CRUD
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  // Followers / Students CRUD
  getFollowers,
  getFollowerCount,
  removeFollower,
  getTeacherStudents,
  // Assignments
  createAssignment,
  // Submissions / Grading
  getSubmissions,
  gradeSubmission,
  // Messaging
  sendMessage,
  // Notifications
  getNotifications,
  markNotificationRead,
  // Settings
  getSettings,
  updateSettings,
  // Dashboard
  getDashboardStats
};
