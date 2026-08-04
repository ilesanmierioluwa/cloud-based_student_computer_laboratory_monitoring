const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: {
    type: String,
    enum: ['blocked-app', 'blocked-website', 'usb-restriction', 'time-restriction', 'idle-timeout'],
    required: true,
  },
  rule: {
    appName: { type: String },
    processName: { type: String },
    usbClass: { type: String },
    allowedHoursStart: { type: String },
    allowedHoursEnd: { type: String },
    idleMinutes: { type: Number },
  },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  appliesToLabs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory' }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Policy', policySchema);