const { AuditLog } = require('../models');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.actorId) filter.actorId = req.query.actorId;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.targetType) filter.targetType = req.query.targetType;

    const logs = await AuditLog.find(filter)
      .populate('actorId', 'fullName email role')
      .sort({ timestamp: -1 })
      .limit(200);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};