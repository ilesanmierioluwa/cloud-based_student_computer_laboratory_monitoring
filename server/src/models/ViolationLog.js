const mongoose = require('mongoose');

const violationLogSchema = new mongoose.Schema({
  machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
  type: { type: String, enum: ['blocked-app', 'blocked-website', 'usb-restriction', 'time-restriction', 'idle-timeout'], required: true },
  detail: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
  status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
  occurrenceCount: { type: Number, default: 1 },
  detectedAt: { type: Date, default: Date.now },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
}, { timestamps: true });

violationLogSchema.index({ machineId: 1, policyId: 1, status: 1 });
violationLogSchema.index({ status: 1, detectedAt: -1 });

module.exports = mongoose.model('ViolationLog', violationLogSchema);