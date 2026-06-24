const express = require('express');
const { requireAuth } = require('../middleware/unified-auth');
const ctrl = require('../controllers/adminPortalController');

const router = express.Router();

router.use(requireAuth('ADMIN', 'CEO'));

router.get('/analytics/revenue', ctrl.getRevenueAnalytics);
router.get('/analytics/users', ctrl.getUsersAnalytics);

router.get('/tasks', ctrl.getTasks);
router.post('/tasks', ctrl.createTask);

router.get('/strategic-goals', ctrl.getStrategicGoals);
router.post('/strategic-goals', ctrl.createStrategicGoal);

router.put('/reports/:id/resolve', ctrl.resolveReport);

module.exports = router;
