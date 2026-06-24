const express = require('express');
const { createPartnerRequest } = require('../controllers/partnerController');

const router = express.Router();

router.post('/request', createPartnerRequest);

module.exports = router;

