const prisma = require('../models/prisma');

// ─── MOCK DATES ─────────────────────────────────────────────
exports.getMockDates = async (req, res) => {
  try {
    const { id: userId, role, centreId } = req.user;
    if (role !== 'CENTRE' || !centreId) return res.status(403).json({ error: 'No associated centre' });
    
    const mocks = await prisma.mockSession.findMany({ where: { centreId } });
    res.json(mocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createMockDate = async (req, res) => {
  try {
    const { id: userId, role, centreId } = req.user;
    if (role !== 'CENTRE' || !centreId) return res.status(403).json({ error: 'No associated centre' });
    
    const { dateTime, type, format, location, capacity, price, notes } = req.body;
    const session = await prisma.mockSession.create({
      data: { centreId, dateTime: new Date(dateTime), type, format, location, capacity, price, notes }
    });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── MOCK RESULTS ───────────────────────────────────────────
exports.getMockResults = async (req, res) => {
  try {
    // Scaffold - fetches mock results for the centre
    res.json({ message: 'getMockResults' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMockResult = async (req, res) => {
  try {
    res.json({ message: 'updateMockResult' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── GROUPS ──────────────────────────────────────────────────
exports.getGroups = async (req, res) => {
  try {
    const { centreId } = req.user;
    if (!centreId) return res.status(403).json({ error: 'No centre' });
    const groups = await prisma.studyGroup.findMany({ where: { centreId } });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createGroup = async (req, res) => {
  try {
    const { centreId } = req.user;
    if (!centreId) return res.status(403).json({ error: 'No centre' });
    const { name, level, schedule, capacity } = req.body;
    const group = await prisma.studyGroup.create({
      data: { centreId, name, level, schedule, capacity }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── APPLICATIONS ────────────────────────────────────────────
exports.handleApplication = async (req, res) => {
  try {
    const { id, action } = req.params; // action: accept/decline
    const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED';
    
    const app = await prisma.groupApplication.update({
      where: { id: parseInt(id, 10) },
      data: { status }
    });
    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
