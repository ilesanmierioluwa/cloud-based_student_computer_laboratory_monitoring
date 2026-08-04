const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true },
  timestamp: { type: Date, default: Date.now },
  cpuUsagePercent: { type: Number },
  ramUsagePercent: { type: Number },
  diskUsagePercent: { type: Number },
  foregroundApp: { type: String, trim: true },
  networkUpKbps: { type: Number },
  networkDownKbps: { type: Number },
  uptimeSeconds: { type: Number },
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'machineId',
    granularity: 'seconds',
  },
});

telemetrySchema.index({ machineId: 1, timestamp: -1 });

module.exports = mongoose.model('Telemetry', telemetrySchema);