const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticate, authorize } = require('../middleware/auth');
const { agentAuth } = require('../middleware/agentAuth');
const { auditLog } = require('../middleware/auditLog');

// Agent-facing
router.post('/start', agentAuth, sessionController.start);
router.post('/status', agentAuth, sessionController.agentStatus);
router.post('/:id/end', agentAuth, sessionController.end);

// Dashboard-facing
router.post('/:id/force-end', authenticate, authorize('admin', 'technician'), auditLog('FORCE_END_SESSION', 'Session'), sessionController.forceEnd);
router.get('/machine/:machineId', authenticate, sessionController.getByMachine);
router.get('/', authenticate, sessionController.getActive);

module.exports = router;