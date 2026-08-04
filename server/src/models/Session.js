const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  loginMethod: { type: String, enum: ['matric', 'guest', 'staff'], required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  durationSeconds: { type: Number },
  status: { type: String, enum: ['active', 'ended', 'forcefully-terminated'], default: 'active' },
  purpose: { type: String, trim: true },
  courseCode: { type: String, trim: true },
}, { timestamps: true });

sessionSchema.index({ machineId: 1, status: 1 });
sessionSchema.index({ studentId: 1, startTime: -1 });

module.exports = mongoose.model('Session', sessionSchema);