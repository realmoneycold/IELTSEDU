const prisma = require('../models/prisma');

// ─── PRACTICE ───────────────────────────────────────────────
exports.saveTypingPractice = async (req, res) => {
  try {
    const { wpm, accuracy, durationMinutes } = req.body;
    const result = await prisma.typingResult.create({
      data: { userId: req.user.id, wpm, accuracy, durationMinutes }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveAiChat = async (req, res) => {
  try {
    const { topic, history, messageCount } = req.body;
    const session = await prisma.aiChatSession.create({
      data: { userId: req.user.id, topic, history, messageCount }
    });
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─── PERFORMANCE ─────────────────────────────────────────────
exports.getWeeklyPerformance = async (req, res) => {
  try {
    const performance = await prisma.weeklyProgress.findMany({
      where: { userId: req.user.id },
      orderBy: { weekStartDate: 'desc' },
      take: 4
    });
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
