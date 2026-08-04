const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', required: true },
  date: { type: Date, required: true },
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date },
  verifiedBy: { type: String, enum: ['system', 'manual'], default: 'system' },
  status: { type: String, enum: ['present', 'left-early', 'no-checkout'], default: 'present' },
}, { timestamps: true });

attendanceRecordSchema.index({ labId: 1, date: 1 });
attendanceRecordSchema.index({ studentId: 1, date: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);