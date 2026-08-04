const mongoose = require('mongoose');

const remoteCommandLogSchema = new mongoose.Schema({
  machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine', required: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  commandType: {
    type: String,
    enum: ['lock', 'unlock', 'message', 'shutdown', 'restart', 'logout-session', 'broadcast'],
    required: true,
  },
  payload: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'delivered', 'executed', 'failed'], default: 'pending' },
  issuedAt: { type: Date, default: Date.now },
  executedAt: { type: Date },
  errorMessage: { type: String },
}, { timestamps: true });

remoteCommandLogSchema.index({ machineId: 1, status: 1 });

module.exports = mongoose.model('RemoteCommandLog', remoteCommandLogSchema);