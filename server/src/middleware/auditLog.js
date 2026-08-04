const { AuditLog } = require('../models');

const auditLog = (action, targetType) => {
  return async (req, res, next) => {
    const originalSend = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const targetId = req.params.id || req.params.machineId || req.params.labId || req.params.sessionId || null;
        AuditLog.create({
          actorId: req.user._id,
          action,
          targetType,
          targetId,
          ipAddress: req.ip,
          detail: { method: req.method, path: req.originalUrl, body: req.method !== 'GET' ? req.body : undefined },
        }).catch(() => {});
      }
      return originalSend(body);
    };
    next();
  };
};

module.exports = { auditLog };