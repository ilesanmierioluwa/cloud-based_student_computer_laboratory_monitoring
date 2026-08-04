const { validationResult } = require('express-validator');
const { Policy } = require('../models');
const { getIO } = require('../config/socket');

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const policy = await Policy.create({ ...req.body, createdBy: req.user._id });

    getIO().emit('policy:sync', { action: 'created', policy });

    res.status(201).json({ policy });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.labId) filter.appliesToLabs = req.query.labId;

    const policies = await Policy.find(filter)
      .populate('createdBy', 'fullName email')
      .populate('appliesToLabs', 'name location')
      .sort({ createdAt: -1 });
    res.json({ policies });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const policy = await Policy.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('appliesToLabs', 'name location');
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json({ policy });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const policy = await Policy.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    getIO().emit('policy:sync', { action: 'updated', policy });

    res.json({ policy });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    getIO().emit('policy:sync', { action: 'deleted', policyId: req.params.id });

    res.json({ message: 'Policy deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getForLab = async (req, res, next) => {
  try {
    const policies = await Policy.find({
      isActive: true,
      $or: [{ appliesToLabs: req.params.labId }, { appliesToLabs: { $size: 0 } }],
    });
    res.json({ policies });
  } catch (error) {
    next(error);
  }
};