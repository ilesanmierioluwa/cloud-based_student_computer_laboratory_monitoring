const express = require('express');
const router = express.Router();
const violationController = require('../controllers/violationController');
const { authenticate, authorize } = require('../middleware/auth');
const { agentAuth } = require('../middleware/agentAuth');
const { auditLog } = require('../middleware/auditLog');

// Agent-facing
router.post('/report', agentAuth, violationController.report);

// Dashboard-facing
router.get('/', authenticate, violationController.getAll);
router.get('/:id', authenticate, violationController.getById);
router.patch('/:id/acknowledge', authenticate, authorize('admin', 'technician'), auditLog('ACKNOWLEDGE_VIOLATION', 'ViolationLog'), violationController.acknowledge);
router.patch('/:id/resolve', authenticate, authorize('admin', 'technician'), auditLog('RESOLVE_VIOLATION', 'ViolationLog'), violationController.resolve);

module.exports = router;