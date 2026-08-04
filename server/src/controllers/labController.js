const { validationResult } = require('express-validator');
const { Laboratory, Machine } = require('../models');

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lab = await Laboratory.create(req.body);
    res.status(201).json({ lab });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const labs = await Laboratory.find()
      .populate('technicianInCharge', 'fullName staffId email')
      .lean();

    const labsWithCounts = await Promise.all(
      labs.map(async (lab) => {
        const machineCount = await Machine.countDocuments({ labId: lab._id });
        const onlineCount = await Machine.countDocuments({ labId: lab._id, status: { $in: ['online', 'in-use', 'locked', 'idle'] } });
        return { ...lab, machineCount, onlineCount };
      })
    );

    res.json({ labs: labsWithCounts });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const lab = await Laboratory.findById(req.params.id).populate('technicianInCharge', 'fullName staffId email');
    if (!lab) return res.status(404).json({ error: 'Laboratory not found' });

    const machineCount = await Machine.countDocuments({ labId: lab._id });
    const onlineCount = await Machine.countDocuments({ labId: lab._id, status: { $in: ['online', 'in-use', 'locked', 'idle'] } });

    res.json({ lab: { ...lab.toJSON(), machineCount, onlineCount } });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const lab = await Laboratory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lab) return res.status(404).json({ error: 'Laboratory not found' });
    res.json({ lab });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const lab = await Laboratory.findByIdAndDelete(req.params.id);
    if (!lab) return res.status(404).json({ error: 'Laboratory not found' });
    await Machine.updateMany({ labId: req.params.id }, { labId: null });
    res.json({ message: 'Laboratory deleted' });
  } catch (error) {
    next(error);
  }
};