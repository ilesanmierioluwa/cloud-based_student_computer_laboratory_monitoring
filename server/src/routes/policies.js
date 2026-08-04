const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const policyController = require('../controllers/policyController');
const { authenticate, authorize } = require('../middleware/auth');
const { agentAuth } = require('../middleware/agentAuth');
const { auditLog } = require('../middleware/auditLog');

// Agent-facing
router.get('/lab/:labId', agentAuth, policyController.getForLab);

// Dashboard-facing
router.post('/', authenticate, authorize('admin'), [body('name').trim().notEmpty(), body('type').isIn(['blocked-app', 'blocked-website', 'usb-restriction', 'time-restriction', 'idle-timeout'])], auditLog('CREATE_POLICY', 'Policy'), policyController.create);
router.get('/', authenticate, policyController.getAll);
router.get('/:id', authenticate, policyController.getById);
router.put('/:id', authenticate, authorize('admin'), auditLog('UPDATE_POLICY', 'Policy'), policyController.update);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE_POLICY', 'Policy'), policyController.remove);

module.exports = router;