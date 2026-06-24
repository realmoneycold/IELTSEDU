const prisma = require('../models/prisma');

// ─── ANALYTICS ──────────────────────────────────────────────
exports.getRevenueAnalytics = async (req, res) => {
  try {
    res.json({ message: 'getRevenueAnalytics scaffold' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsersAnalytics = async (req, res) => {
  try {
    res.json({ message: 'getUsersAnalytics scaffold' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── TASKS ───────────────────────────────────────────────────
exports.getTasks = async (req, res) => {
  try {
    const tasks = await prisma.adminTask.findMany({ where: { isDone: false } });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, label, priority } = req.body;
    const task = await prisma.adminTask.create({
      data: { adminId: req.user.id, title, label, priority }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── STRATEGIC GOALS ─────────────────────────────────────────
exports.getStrategicGoals = async (req, res) => {
  try {
    const goals = await prisma.strategicGoal.findMany();
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createStrategicGoal = async (req, res) => {
  try {
    const { title, priority, column } = req.body;
    const goal = await prisma.strategicGoal.create({
      data: { title, priority, column }
    });
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── REPORTS ─────────────────────────────────────────────────
exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await prisma.report.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'RESOLVED', resolvedById: req.user.id, resolvedAt: new Date() }
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
