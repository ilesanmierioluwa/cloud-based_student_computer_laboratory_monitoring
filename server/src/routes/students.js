const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.post('/', authenticate, authorize('admin', 'technician'), [body('fullName').trim().notEmpty(), body('matricNumber').trim().notEmpty()], auditLog('CREATE_STUDENT', 'Student'), studentController.create);
router.get('/', authenticate, studentController.getAll);
router.get('/:id', authenticate, studentController.getById);
router.put('/:id', authenticate, authorize('admin', 'technician'), auditLog('UPDATE_STUDENT', 'Student'), studentController.update);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE_STUDENT', 'Student'), studentController.remove);

module.exports = router;