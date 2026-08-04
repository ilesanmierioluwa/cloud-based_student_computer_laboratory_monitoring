const mongoose = require('mongoose');

const labSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: { type: String, trim: true },
  capacity: { type: Number, required: true, min: 1 },
  technicianInCharge: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

labSchema.virtual('machineCount', {
  ref: 'Machine',
  localField: '_id',
  foreignField: 'labId',
  count: true,
});

labSchema.set('toJSON', { virtuals: true });
labSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Laboratory', labSchema);