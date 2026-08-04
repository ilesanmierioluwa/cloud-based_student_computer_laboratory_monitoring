const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  matricNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  department: { type: String, trim: true },
  level: { type: String, trim: true },
  faceOrCardId: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);