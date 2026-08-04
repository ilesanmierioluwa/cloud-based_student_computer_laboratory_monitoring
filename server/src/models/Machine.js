const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Laboratory', default: null },
  machineTag: { type: String, required: true, unique: true, trim: true },
  hostname: { type: String, trim: true },
  macAddress: { type: String, trim: true },
  ipAddress: { type: String, trim: true },
  status: {
    type: String,
    enum: ['online', 'offline', 'locked', 'in-use', 'idle', 'fault'],
    default: 'offline',
  },
  os: { type: String, trim: true },
  agentVersion: { type: String, trim: true },
  lastHeartbeat: { type: Date },
  specs: {
    cpu: { type: String },
    ram: { type: String },
    disk: { type: String },
  },
  offlineCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Machine', machineSchema);