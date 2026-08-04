const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');
const { authenticate, authorize } = require('../middleware/auth');
const { agentAuth } = require('../middleware/agentAuth');
const { auditLog } = require('../middleware/auditLog');

// Agent registration (uses agent token, not JWT)
router.post('/register', agentAuth, machineController.register);
router.post('/heartbeat', agentAuth, machineController.heartbeat);

router.get('/', authenticate, machineController.getAll);
router.get('/:id', authenticate, machineController.getById);

router.put('/:id', authenticate, authorize('admin', 'technician'), auditLog('UPDATE_MACHINE', 'Machine'), machineController.update);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE_MACHINE', 'Machine'), machineController.remove);

module.exports = router;