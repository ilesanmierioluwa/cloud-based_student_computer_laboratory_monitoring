const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, reportController.getDashboardSummary);
router.get('/usage', authenticate, reportController.getUsageOverTime);
router.get('/machine-utilization', authenticate, reportController.getMachineUtilization);
router.get('/violation-trends', authenticate, reportController.getViolationTrends);

module.exports = router;