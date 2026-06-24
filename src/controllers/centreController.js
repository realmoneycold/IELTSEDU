const prisma = require('../models/prisma');

// ═══════════════════════════════════════════════════════════════
// CENTRE PROFILE CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/centre/profile - Get current centre profile
async function getCentreProfile(req, res) {
  try {
    const centreId = req.user.centreId;

    const centre = await prisma.educationCentre.findUnique({
      where: { id: centreId },
      include: {
        _count: {
          select: {
            mockSessions: true,
            StudyGroup: true,
            inquiries: true
          }
        }
      }
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        error: 'Centre profile not found',
        code: 'CENTRE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: centre
    });
  } catch (error) {
    console.error('Get centre profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch centre profile',
      code: 'CENTRE_PROFILE_ERROR'
    });
  }
}

// PUT /api/centre/profile - Update centre profile
async function updateCentreProfile(req, res) {
  try {
    const centreId = req.user.centreId;
    const {
      name, city, country, address, email, phone, website
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (address !== undefined) updateData.address = address;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;

    const centre = await prisma.educationCentre.update({
      where: { id: centreId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Centre profile updated successfully',
      data: centre
    });
  } catch (error) {
    console.error('Update centre profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update centre profile',
      code: 'CENTRE_PROFILE_UPDATE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// MOCK SESSIONS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/centre/mock-sessions - List all mock sessions for centre
async function getMockSessions(req, res) {
  try {
    const centreId = req.user.centreId;
    const { page = 1, limit = 10, type, upcoming = '' } = req.query;

    const where = { centreId };

    if (type) {
      where.type = type;
    }

    if (upcoming === 'true') {
      where.dateTime = { gte: new Date() };
    }

    const [sessions, total] = await Promise.all([
      prisma.mockSession.findMany({
        where,
        include: {
          _count: {
            select: {
              results: true,
              bookings: true
            }
          }
        },
        orderBy: { dateTime: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.mockSession.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get mock sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mock sessions',
      code: 'MOCK_SESSIONS_ERROR'
    });
  }
}

// GET /api/centre/mock-sessions/:id - Get single mock session
async function getMockSessionById(req, res) {
  try {
    const centreId = req.user.centreId;
    const sessionId = parseInt(req.params.id);

    const session = await prisma.mockSession.findFirst({
      where: { id: sessionId, centreId },
      include: {
        results: {
          include: {
            student: {
              select: {
                id: true,
                full_name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Mock session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Get mock session by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mock session',
      code: 'MOCK_SESSION_FETCH_ERROR'
    });
  }
}

// POST /api/centre/mock-sessions - Create new mock session
async function createMockSession(req, res) {
  try {
    const centreId = req.user.centreId;
    const { dateTime, type, format, location, capacity, price, notes } = req.body;

    // Validation
    if (!dateTime || !type || !format) {
      return res.status(400).json({
        success: false,
        error: 'dateTime, type, and format are required',
        code: 'MISSING_FIELDS'
      });
    }

    const session = await prisma.mockSession.create({
      data: {
        centreId,
        dateTime: new Date(new Date(dateTime).toISOString()),
        type,
        format,
        location: location || 'TBD',
        capacity: capacity ? parseInt(capacity) : 30,
        price: price ? parseFloat(price) : 0,
        notes: notes || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Mock session created successfully',
      data: session
    });
  } catch (error) {
    console.error('Create mock session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create mock session',
      code: 'MOCK_SESSION_CREATE_ERROR'
    });
  }
}

// PUT /api/centre/mock-sessions/:id - Update mock session
async function updateMockSession(req, res) {
  try {
    const centreId = req.user.centreId;
    const sessionId = parseInt(req.params.id);
    const { dateTime, type, format, location, capacity, price, notes } = req.body;

    // Check if session belongs to centre
    const existing = await prisma.mockSession.findFirst({
      where: { id: sessionId, centreId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Mock session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const updateData = {};
    if (dateTime !== undefined) updateData.dateTime = new Date(new Date(dateTime).toISOString());
    if (type !== undefined) updateData.type = type;
    if (format !== undefined) updateData.format = format;
    if (location !== undefined) updateData.location = location;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (price !== undefined) updateData.price = price ? parseFloat(price) : null;
    if (notes !== undefined) updateData.notes = notes;

    const session = await prisma.mockSession.update({
      where: { id: sessionId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Mock session updated successfully',
      data: session
    });
  } catch (error) {
    console.error('Update mock session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mock session',
      code: 'MOCK_SESSION_UPDATE_ERROR'
    });
  }
}

// DELETE /api/centre/mock-sessions/:id - Delete mock session
async function deleteMockSession(req, res) {
  try {
    const centreId = req.user.centreId;
    const sessionId = parseInt(req.params.id);

    // Check if session belongs to centre
    const existing = await prisma.mockSession.findFirst({
      where: { id: sessionId, centreId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Mock session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    await prisma.mockSession.delete({
      where: { id: sessionId }
    });

    res.json({
      success: true,
      message: 'Mock session deleted successfully'
    });
  } catch (error) {
    console.error('Delete mock session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete mock session',
      code: 'MOCK_SESSION_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// MOCK RESULTS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/centre/mock-results - List all mock results for centre sessions
async function getMockResults(req, res) {
  try {
    const centreId = req.user.centreId;
    const { page = 1, limit = 20, sessionId } = req.query;

    const where = {};

    // Get all session IDs for this centre
    const centreSessions = await prisma.mockSession.findMany({
      where: { centreId },
      select: { id: true }
    });

    const sessionIds = centreSessions.map(s => s.id);

    if (sessionId) {
      where.sessionId = parseInt(sessionId);
    } else {
      where.sessionId = { in: sessionIds };
    }

    const [results, total] = await Promise.all([
      prisma.mockResult.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          },
          session: {
            select: {
              id: true,
              dateTime: true,
              type: true,
              format: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.mockResult.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        results,
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

// PUT /api/centre/mock-results/:id - Update mock result
async function updateMockResult(req, res) {
  try {
    const centreId = req.user.centreId;
    const resultId = parseInt(req.params.id);
    const { listening, reading, writing, speaking, overall } = req.body;

    // Get the result and verify it belongs to a centre session
    const result = await prisma.mockResult.findUnique({
      where: { id: resultId },
      include: {
        session: true
      }
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Mock result not found',
        code: 'RESULT_NOT_FOUND'
      });
    }

    if (result.session && result.session.centreId !== centreId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this result',
        code: 'FORBIDDEN'
      });
    }

    const updateData = {};
    if (listening !== undefined) updateData.listening = parseFloat(listening);
    if (reading !== undefined) updateData.reading = parseFloat(reading);
    if (writing !== undefined) updateData.writing = parseFloat(writing);
    if (speaking !== undefined) updateData.speaking = parseFloat(speaking);
    if (overall !== undefined) updateData.overall = parseFloat(overall);

    const updatedResult = await prisma.mockResult.update({
      where: { id: resultId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Mock result updated successfully',
      data: updatedResult
    });
  } catch (error) {
    console.error('Update mock result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mock result',
      code: 'MOCK_RESULT_UPDATE_ERROR'
    });
  }
}

// DELETE /api/centre/mock-results/:id - Delete mock result
async function deleteMockResult(req, res) {
  try {
    const centreId = req.user.centreId;
    const resultId = parseInt(req.params.id);

    const result = await prisma.mockResult.findUnique({
      where: { id: resultId },
      include: {
        session: true
      }
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Mock result not found',
        code: 'RESULT_NOT_FOUND'
      });
    }

    if (result.session && result.session.centreId !== centreId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this result',
        code: 'FORBIDDEN'
      });
    }

    await prisma.mockResult.delete({
      where: { id: resultId }
    });

    res.json({
      success: true,
      message: 'Mock result deleted successfully'
    });
  } catch (error) {
    console.error('Delete mock result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete mock result',
      code: 'MOCK_RESULT_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// STUDY GROUPS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/centre/groups - List all study groups for centre
async function getStudyGroups(req, res) {
  try {
    const centreId = req.user.centreId;
    const { page = 1, limit = 10, status, level } = req.query;

    const where = { centreId };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (level) {
      where.level = level;
    }

    const [groups, total] = await Promise.all([
      prisma.studyGroup.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              full_name: true,
              email: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.studyGroup.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        groups,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get study groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch study groups',
      code: 'GROUPS_ERROR'
    });
  }
}

// GET /api/centre/groups/:id - Get single study group
async function getStudyGroupById(req, res) {
  try {
    const centreId = req.user.centreId;
    const groupId = parseInt(req.params.id);

    const group = await prisma.studyGroup.findFirst({
      where: { id: groupId, centreId },
      include: {
        teacher: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        },
        applications: {
          include: {
            student: {
              select: {
                id: true,
                full_name: true,
                email: true,
                current_band: true,
                target_band: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Get study group by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch study group',
      code: 'GROUP_FETCH_ERROR'
    });
  }
}

// POST /api/centre/groups - Create new study group
async function createStudyGroup(req, res) {
  try {
    const centreId = req.user.centreId;
    const { name, level, schedule, startDate, endDate, capacity, description, teacherId, teacherName, price, location, mapUrl, latitude, longitude } = req.body;

    // Validation
    if (!name || !level || !schedule) {
      return res.status(400).json({
        success: false,
        error: 'name, level, and schedule are required',
        code: 'MISSING_FIELDS'
      });
    }

    const group = await prisma.studyGroup.create({
      data: {
        centreId,
        name,
        level,
        schedule,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        capacity: capacity ? parseInt(capacity) : 15,
        status: 'OPEN',
        description: description || null,
        teacherId: teacherId ? parseInt(teacherId) : null,
        teacherName: teacherName || null,
        price: price ? parseInt(price) : null,
        location: location || null,
        mapUrl: mapUrl || null,
        latitude: latitude !== undefined && latitude !== '' ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== '' ? parseFloat(longitude) : null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Study group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Create study group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create study group',
      code: 'GROUP_CREATE_ERROR'
    });
  }
}

// PUT /api/centre/groups/:id - Update study group
async function updateStudyGroup(req, res) {
  try {
    const centreId = req.user.centreId;
    const groupId = parseInt(req.params.id);
    const { name, level, schedule, startDate, endDate, capacity, status, description, teacherId, teacherName, price, location, mapUrl, latitude, longitude } = req.body;

    // Check if group belongs to centre
    const existing = await prisma.studyGroup.findFirst({
      where: { id: groupId, centreId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (level !== undefined) updateData.level = level;
    if (schedule !== undefined) updateData.schedule = schedule;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (status !== undefined) updateData.status = status.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (teacherId !== undefined) updateData.teacherId = teacherId ? parseInt(teacherId) : null;
    if (teacherName !== undefined) updateData.teacherName = teacherName || null;
    if (price !== undefined) updateData.price = price ? parseInt(price) : null;
    if (location !== undefined) updateData.location = location || null;
    if (mapUrl !== undefined) updateData.mapUrl = mapUrl || null;
    if (latitude !== undefined && latitude !== '') updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined && longitude !== '') updateData.longitude = parseFloat(longitude);

    const group = await prisma.studyGroup.update({
      where: { id: groupId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Study group updated successfully',
      data: group
    });
  } catch (error) {
    console.error('Update study group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update study group',
      code: 'GROUP_UPDATE_ERROR'
    });
  }
}

// DELETE /api/centre/groups/:id - Delete study group
async function deleteStudyGroup(req, res) {
  try {
    const centreId = req.user.centreId;
    const groupId = parseInt(req.params.id);

    // Check if group belongs to centre
    const existing = await prisma.studyGroup.findFirst({
      where: { id: groupId, centreId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    await prisma.studyGroup.delete({
      where: { id: groupId }
    });

    res.json({
      success: true,
      message: 'Study group deleted successfully'
    });
  } catch (error) {
    console.error('Delete study group error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete study group',
      code: 'GROUP_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// GROUP APPLICATIONS CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/centre/groups/:id/applications - Get applications for a group
async function getGroupApplications(req, res) {
  try {
    const centreId = req.user.centreId;
    const groupId = parseInt(req.params.id);

    // Verify group belongs to centre
    const group = await prisma.studyGroup.findFirst({
      where: { id: groupId, centreId }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Study group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    const applications = await prisma.groupApplication.findMany({
      where: { groupId },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            email: true,
            current_band: true,
            target_band: true,
            phone: true,
            country: true
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
    console.error('Get group applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      code: 'APPLICATIONS_ERROR'
    });
  }
}

// GET /api/centre/applications - Get all pending applications across all groups
async function getAllApplications(req, res) {
  try {
    const centreId = req.user.centreId;

    const centreGroups = await prisma.studyGroup.findMany({
      where: { centreId },
      select: { id: true, name: true }
    });

    const groupIds = centreGroups.map(g => g.id);

    const applications = await prisma.groupApplication.findMany({
      where: {
        groupId: { in: groupIds }
      },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            email: true,
            current_band: true,
            target_band: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
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
    console.error('Get all applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      code: 'APPLICATIONS_ERROR'
    });
  }
}

// POST /api/centre/applications/:id/respond - Accept or decline application
async function respondToApplication(req, res) {
  try {
    const centreId = req.user.centreId;
    const applicationId = parseInt(req.params.id);
    const { action } = req.body; // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be "accept" or "decline"',
        code: 'INVALID_ACTION'
      });
    }

    const application = await prisma.groupApplication.findUnique({
      where: { id: applicationId },
      include: {
        group: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      });
    }

    if (application.group.centreId !== centreId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to respond to this application',
        code: 'FORBIDDEN'
      });
    }

    const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';

    const updatedApplication = await prisma.groupApplication.update({
      where: { id: applicationId },
      data: { status }
    });

    res.json({
      success: true,
      message: `Application ${action}ed successfully`,
      data: updatedApplication
    });
  } catch (error) {
    console.error('Respond to application error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to respond to application',
      code: 'APPLICATION_RESPOND_ERROR'
    });
  }
}

// POST /api/v1/public/centres/groups/:id/apply - Public application to a study group
async function createGroupApplication(req, res) {
  try {
    const groupId = parseInt(req.params.id);
    const { firstName, lastName, phone, previousScore } = req.body;

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        success: false,
        error: 'firstName, lastName, and phone are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Check group exists and is open
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      select: { id: true, status: true, capacity: true, _count: { select: { applications: true } } }
    });

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found', code: 'GROUP_NOT_FOUND' });
    }

    if (group.status !== 'OPEN') {
      return res.status(400).json({ success: false, error: 'Group is not accepting applications', code: 'GROUP_CLOSED' });
    }

    if (group._count.applications >= group.capacity) {
      return res.status(400).json({ success: false, error: 'Group is full', code: 'GROUP_FULL' });
    }

    const application = await prisma.groupApplication.create({
      data: {
        groupId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        previousScore: previousScore ? parseFloat(previousScore) : null,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Create group application error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit application', code: 'APPLICATION_CREATE_ERROR' });
  }
}

// ═══════════════════════════════════════════════════════════════
// INQUIRIES CRUD
// ═══════════════════════════════════════════════════════════════

// GET /api/centre/inquiries - List all inquiries for centre
async function getInquiries(req, res) {
  try {
    const centreId = req.user.centreId;
    const { isRead = '', page = 1, limit = 20 } = req.query;

    const where = { centreId };

    if (isRead !== '') {
      where.isRead = isRead === 'true';
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.inquiry.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        inquiries,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inquiries',
      code: 'INQUIRIES_ERROR'
    });
  }
}

// PATCH /api/centre/inquiries/:id/mark-read - Mark inquiry as read
async function markInquiryRead(req, res) {
  try {
    const centreId = req.user.centreId;
    const inquiryId = parseInt(req.params.id);

    const inquiry = await prisma.inquiry.findFirst({
      where: { id: inquiryId, centreId }
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: 'Inquiry not found',
        code: 'INQUIRY_NOT_FOUND'
      });
    }

    const updated = await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Inquiry marked as read',
      data: updated
    });
  } catch (error) {
    console.error('Mark inquiry read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark inquiry as read',
      code: 'INQUIRY_UPDATE_ERROR'
    });
  }
}

// DELETE /api/centre/inquiries/:id - Delete inquiry
async function deleteInquiry(req, res) {
  try {
    const centreId = req.user.centreId;
    const inquiryId = parseInt(req.params.id);

    const inquiry = await prisma.inquiry.findFirst({
      where: { id: inquiryId, centreId }
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        error: 'Inquiry not found',
        code: 'INQUIRY_NOT_FOUND'
      });
    }

    await prisma.inquiry.delete({
      where: { id: inquiryId }
    });

    res.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete inquiry',
      code: 'INQUIRY_DELETE_ERROR'
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════

// GET /api/centre/dashboard-stats - Get centre dashboard statistics
async function getDashboardStats(req, res) {
  try {
    const centreId = req.user.centreId;

    const [
      totalStudents,
      activeStudents,
      totalSessions,
      upcomingSessions,
      totalGroups,
      openGroups,
      pendingApplications,
      unreadInquiries
    ] = await Promise.all([
      prisma.user.count({ where: { centreId, role: 'STUDENT' } }),
      prisma.user.count({
        where: {
          centreId,
          role: 'STUDENT',
          lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
        }
      }),
      prisma.mockSession.count({ where: { centreId } }),
      prisma.mockSession.count({
        where: {
          centreId,
          dateTime: { gte: new Date() }
        }
      }),
      prisma.studyGroup.count({ where: { centreId } }),
      prisma.studyGroup.count({
        where: {
          centreId,
          status: 'OPEN'
        }
      }),
      prisma.groupApplication.count({
        where: {
          group: { centreId },
          status: 'PENDING'
        }
      }),
      prisma.inquiry.count({
        where: {
          centreId,
          isRead: false
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          activeNow: activeStudents
        },
        sessions: {
          total: totalSessions,
          upcoming: upcomingSessions
        },
        groups: {
          total: totalGroups,
          open: openGroups
        },
        applications: {
          pending: pendingApplications
        },
        inquiries: {
          unread: unreadInquiries
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

// GET /api/centres/locations - Get all education centres with geolocation
async function getCentresWithLocations(req, res) {
  try {
    const centres = await prisma.educationCentre.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        city: true,
        address: true,
        phone: true,
        website: true,
        rating: true
      }
    });

    res.json({
      success: true,
      data: centres
    });
  } catch (error) {
    console.error('Get centres with locations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch centres with locations',
      code: 'CENTRES_LOCATIONS_ERROR'
    });
  }
}

// GET /api/public/centres - Get simple list of active education centres
async function getEducationCentres(req, res) {
  try {
    const centres = await prisma.educationCentre.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        rating: true
      }
    });

    res.json({
      success: true,
      data: centres
    });
  } catch (error) {
    console.error('Get education centres error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch education centres',
      code: 'CENTRES_LIST_ERROR'
    });
  }
}

// GET /api/v1/public/centres/mock-sessions - Public: upcoming mock sessions from all centres
async function getPublicMockSessions(req, res) {
  try {
    const { type, format, city, limit = 50 } = req.query;

    const centreWhere = {};
    if (city) centreWhere.city = { contains: city, mode: 'insensitive' };

    const where = {
      dateTime: { gte: new Date() }
    };
    if (type) where.type = type;
    if (format) where.format = format;

    const sessions = await prisma.mockSession.findMany({
      where,
      include: {
        centre: {
          select: { id: true, name: true, city: true, address: true }
        },
        _count: { select: { results: true, bookings: true } }
      },
      orderBy: { dateTime: 'asc' },
      take: parseInt(limit)
    });

    const filtered = city
      ? sessions.filter(s => s.centre.city && s.centre.city.toLowerCase().includes(city.toLowerCase()))
      : sessions;

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Get public mock sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mock sessions' });
  }
}

// GET /api/public/centres/groups - Get all study groups from all centres (public)
async function getPublicGroups(req, res) {
  try {
    const { city, level, limit = 50 } = req.query;

    const where = {
      status: 'OPEN'
    };

    if (level) where.level = level;

    const groups = await prisma.studyGroup.findMany({
      where,
      include: {
        centre: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            latitude: true,
            longitude: true
          }
        },
        teacher: {
          select: {
            id: true,
            full_name: true
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const filtered = city
      ? groups.filter(g => g.centre.city && g.centre.city.toLowerCase().includes(city.toLowerCase()))
      : groups;

    res.json({ success: true, data: filtered });
  } catch (error) {
    console.error('Get public groups error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch study groups' });
  }
}

// ═══════════════════════════════════════════════════════════════
// MOCK SESSION BOOKINGS CRUD
// ═══════════════════════════════════════════════════════════════

// POST /api/v1/public/centres/mock-sessions/:id/book - Public booking for a mock session
async function createMockSessionBooking(req, res) {
  try {
    const sessionId = parseInt(req.params.id);
    const { firstName, lastName, phone, centre, telegram } = req.body;

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ success: false, error: 'firstName, lastName, and phone are required', code: 'MISSING_FIELDS' });
    }

    const session = await prisma.mockSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { bookings: true } } }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }

    if (session._count.bookings >= session.capacity) {
      return res.status(400).json({ success: false, error: 'Session is full', code: 'SESSION_FULL' });
    }

    const booking = await prisma.mockSessionBooking.create({
      data: {
        sessionId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        centre: centre ? centre.trim() : null,
        telegram: telegram ? telegram.trim() : null,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, message: 'Booking submitted successfully', data: booking });
  } catch (error) {
    console.error('Create mock session booking error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit booking', code: 'BOOKING_CREATE_ERROR' });
  }
}

// GET /api/centre/mock-session-bookings - Get all mock session bookings for centre
async function getMockSessionBookings(req, res) {
  try {
    const centreId = req.user.centreId;

    const centreSessions = await prisma.mockSession.findMany({
      where: { centreId },
      select: { id: true }
    });

    const sessionIds = centreSessions.map(s => s.id);

    const bookings = await prisma.mockSessionBooking.findMany({
      where: { sessionId: { in: sessionIds } },
      include: {
        session: { select: { id: true, dateTime: true, type: true, format: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Get mock session bookings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bookings', code: 'BOOKINGS_ERROR' });
  }
}

// POST /api/centre/mock-session-bookings/:id/respond - Accept or decline a booking
async function respondToMockSessionBooking(req, res) {
  try {
    const centreId = req.user.centreId;
    const bookingId = parseInt(req.params.id);
    const { action } = req.body; // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action. Use accept or decline', code: 'INVALID_ACTION' });
    }

    const booking = await prisma.mockSessionBooking.findUnique({
      where: { id: bookingId },
      include: { session: true }
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found', code: 'BOOKING_NOT_FOUND' });
    }

    if (booking.session.centreId !== centreId) {
      return res.status(403).json({ success: false, error: 'Not authorized', code: 'FORBIDDEN' });
    }

    const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';

    const updatedBooking = await prisma.mockSessionBooking.update({
      where: { id: bookingId },
      data: { status }
    });

    res.json({ success: true, message: `Booking ${action}ed successfully`, data: updatedBooking });
  } catch (error) {
    console.error('Respond to mock session booking error:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to booking', code: 'BOOKING_RESPOND_ERROR' });
  }
}

module.exports = {
  // Profile CRUD
  getCentreProfile,
  updateCentreProfile,
  // Mock Sessions CRUD
  getMockSessions,
  getMockSessionById,
  createMockSession,
  updateMockSession,
  deleteMockSession,
  // Mock Results CRUD
  getMockResults,
  updateMockResult,
  deleteMockResult,
  // Mock Session Bookings CRUD
  createMockSessionBooking,
  getMockSessionBookings,
  respondToMockSessionBooking,
  // Study Groups CRUD
  getStudyGroups,
  getStudyGroupById,
  createStudyGroup,
  updateStudyGroup,
  deleteStudyGroup,
  // Applications CRUD
  getGroupApplications,
  getAllApplications,
  respondToApplication,
  createGroupApplication,
  // Inquiries CRUD
  getInquiries,
  markInquiryRead,
  deleteInquiry,
  // Dashboard
  getDashboardStats,
  getCentresWithLocations,
  getEducationCentres,
  // Public
  getPublicMockSessions,
  getPublicGroups
};
