const bcrypt = require('bcryptjs');
const prisma = require('../models/prisma');

async function createPartnerRequest(req, res) {
  try {
    const { centre_name, ceo_name, email, phone, location, password } = req.body || {};

    if (!centre_name || !ceo_name || !email || !phone || !location || !password) {
      return res
        .status(400)
        .json({ message: 'centre_name, ceo_name, email, phone, location, password are required' });
    }

    const existing = await prisma.partnerRequest.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Partner request already exists for this email' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const request = await prisma.partnerRequest.create({
      data: {
        centre_name,
        ceo_name,
        email,
        phone,
        location,
        password: hashed,
      },
    });

    return res.status(201).json({
      message: 'Partner request submitted',
      id: request.id,
    });
  } catch (err) {
    console.error('Partner request error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createPartnerRequest,
};

