const { Machine, Session, AttendanceRecord, ViolationLog, Telemetry, Laboratory } = require('../models');

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    const [totalMachines, onlineMachines, activeSessions, openViolations, totalLabs] = await Promise.all([
      Machine.countDocuments(),
      Machine.countDocuments({ status: { $in: ['online', 'in-use', 'locked', 'idle'] } }),
      Session.countDocuments({ status: 'active' }),
      ViolationLog.countDocuments({ status: 'open' }),
      Laboratory.countDocuments(),
    ]);

    const totalCapacity = (await Laboratory.find().select('capacity').lean()).reduce((sum, lab) => sum + lab.capacity, 0);
    const utilization = totalCapacity > 0 ? Math.round((activeSessions / totalCapacity) * 100) : 0;

    const todaySessions = await Session.countDocuments({ startTime: { $gte: startOfDay } });
    const todayAttendance = await AttendanceRecord.countDocuments({ date: { $gte: startOfDay } });

    res.json({
      summary: {
        totalLabs,
        totalMachines,
        onlineMachines,
        offlineMachines: totalMachines - onlineMachines,
        activeSessions,
        openViolations,
        utilizationPercent: utilization,
        todaySessions,
        todayAttendance,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsageOverTime = async (req, res, next) => {
  try {
    const { labId, period } = req.query;
    const days = period === 'month' ? 30 : 7;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filter = { startTime: { $gte: sinceDate } };
    if (labId) {
      const machines = await Machine.find({ labId }).select('_id');
      filter.machineId = { $in: machines.map((m) => m._id) };
    }

    const sessions = await Session.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
          count: { $sum: 1 },
          totalDuration: { $sum: '$durationSeconds' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ usage: sessions });
  } catch (error) {
    next(error);
  }
};

exports.getMachineUtilization = async (req, res, next) => {
  try {
    const { labId } = req.query;
    const filter = {};
    if (labId) filter.labId = labId;

    const machines = await Machine.find(filter).lean();
    const machineIds = machines.map((m) => m._id);

    const sessionCounts = await Session.aggregate([
      { $match: { machineId: { $in: machineIds } } },
      { $group: { _id: '$machineId', count: { $sum: 1 }, totalDuration: { $sum: '$durationSeconds' } } },
      { $sort: { count: -1 } },
    ]);

    const utilization = machines.map((machine) => {
      const stats = sessionCounts.find((s) => s._id.equals(machine._id));
      return {
        machineId: machine._id,
        machineTag: machine.machineTag,
        sessionCount: stats?.count || 0,
        totalDurationSeconds: stats?.totalDuration || 0,
      };
    });

    res.json({ utilization });
  } catch (error) {
    next(error);
  }
};

exports.getViolationTrends = async (req, res, next) => {
  try {
    const { labId, days = 30 } = req.query;
    const sinceDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const matchFilter = { detectedAt: { $gte: sinceDate } };
    if (labId) {
      const machines = await Machine.find({ labId }).select('_id');
      matchFilter.machineId = { $in: machines.map((m) => m._id) };
    }

    const trends = await ViolationLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$detectedAt' } }, type: '$type' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    res.json({ trends });
  } catch (error) {
    next(error);
  }
};