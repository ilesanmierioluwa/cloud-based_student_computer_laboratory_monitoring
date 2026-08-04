const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, attendanceController.getAttendance);
router.get('/export/csv', authenticate, attendanceController.exportCSV);
router.get('/export/pdf', authenticate, attendanceController.exportPDF);
router.patch('/:id', authenticate, authorize('admin', 'technician'), attendanceController.manualOverride);

module.exports = router;