const express = require('express');
const router = express.Router();
const commandController = require('../controllers/commandController');
const { authenticate, authorize } = require('../middleware/auth');
const { agentAuth } = require('../middleware/agentAuth');
const { auditLog } = require('../middleware/auditLog');

// Agent-facing
router.post('/ack', agentAuth, commandController.acknowledge);

// Dashboard-facing
router.post('/', authenticate, authorize('admin', 'technician'), auditLog('ISSUE_COMMAND', 'RemoteCommandLog'), commandController.issue);
router.get('/machine/:machineId', authenticate, commandController.getByMachine);
router.get('/pending', authenticate, authorize('admin', 'technician'), commandController.getPending);

module.exports = router;