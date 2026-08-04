const { ViolationLog } = require('../models');
const { getIO } = require('../config/socket');

exports.report = async (req, res, next) => {
  try {
    const { machineId, sessionId, policyId, type, detail, severity } = req.body;

    const FIVE_MINUTES = 5 * 60 * 1000;
    const existingViolation = await ViolationLog.findOne({
      machineId,
      policyId,
      status: 'open',
      detectedAt: { $gte: new Date(Date.now() - FIVE_MINUTES) },
    });

    if (existingViolation) {
      existingViolation.occurrenceCount += 1;
      await existingViolation.save();
      return res.json({ message: 'Violation bumped', violation: existingViolation });
    }

    const violation = await ViolationLog.create({
      machineId,
      sessionId,
      policyId,
      type,
      detail,
      severity: severity || 'medium',
      status: 'open',
      detectedAt: new Date(),
    });

    getIO().to('admin:alerts').emit('alert:new', { violation });
    if (machineId) {
      const Machine = require('../models/Machine');
      const machine = await Machine.findById(machineId);
      if (machine?.labId) {
        getIO().to(`dashboard:lab:${machine.labId}`).emit('alert:new', { violation });
      }
    }

    res.status(201).json({ violation });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.machineId) filter.machineId = req.query.machineId;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.severity) filter.severity = req.query.severity;

    const violations = await ViolationLog.find(filter)
      .populate('machineId', 'machineTag hostname labId')
      .populate('policyId', 'name type')
      .populate('acknowledgedBy', 'fullName')
      .populate('resolvedBy', 'fullName')
      .sort({ detectedAt: -1 })
      .limit(200);
    res.json({ violations });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const violation = await ViolationLog.findById(req.params.id)
      .populate('machineId', 'machineTag hostname labId')
      .populate('policyId', 'name type description rule')
      .populate('sessionId', 'startTime endTime')
      .populate('acknowledgedBy', 'fullName')
      .populate('resolvedBy', 'fullName');
    if (!violation) return res.status(404).json({ error: 'Violation not found' });
    res.json({ violation });
  } catch (error) {
    next(error);
  }
};

exports.acknowledge = async (req, res, next) => {
  try {
    const violation = await ViolationLog.findById(req.params.id);
    if (!violation) return res.status(404).json({ error: 'Violation not found' });

    violation.status = 'acknowledged';
    violation.acknowledgedBy = req.user._id;
    violation.acknowledgedAt = new Date();
    await violation.save();

    getIO().to('admin:alerts').emit('alert:updated', { violation });
    res.json({ violation });
  } catch (error) {
    next(error);
  }
};

exports.resolve = async (req, res, next) => {
  try {
    const violation = await ViolationLog.findById(req.params.id);
    if (!violation) return res.status(404).json({ error: 'Violation not found' });

    violation.status = 'resolved';
    violation.resolvedBy = req.user._id;
    violation.resolvedAt = new Date();
    await violation.save();

    getIO().to('admin:alerts').emit('alert:updated', { violation });
    res.json({ violation });
  } catch (error) {
    next(error);
  }
};