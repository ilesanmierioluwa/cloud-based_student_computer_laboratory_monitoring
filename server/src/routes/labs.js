const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const labController = require('../controllers/labController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

router.post(
  '/',
  authenticate,
  authorize('admin'),
  [body('name').trim().notEmpty(), body('capacity').isInt({ min: 1 })],
  auditLog('CREATE_LAB', 'Laboratory'),
  labController.create
);

router.get('/', authenticate, labController.getAll);
router.get('/:id', authenticate, labController.getById);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'technician'),
  auditLog('UPDATE_LAB', 'Laboratory'),
  labController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  auditLog('DELETE_LAB', 'Laboratory'),
  labController.remove
);

module.exports = router;