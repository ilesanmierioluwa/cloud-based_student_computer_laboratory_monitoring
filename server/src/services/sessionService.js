const { Machine, Session, AttendanceRecord } = require('../models');
const { getIO } = require('../config/socket');

exports.cleanStaleSessions = async () => {
  console.log('Running stale session cleanup...');
  try {
    const thresholdMinutes = 10;
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const offlineMachines = await Machine.find({
      lastHeartbeat: { $lt: threshold },
      status: { $in: ['in-use', 'idle', 'online', 'locked'] },
    });

    for (const machine of offlineMachines) {
      machine.offlineCount = (machine.offlineCount || 0) + 1;
      if (machine.offlineCount >= 3) {
        machine.status = 'offline';
        await machine.save();
        if (machine.labId) {
          getIO().to(`dashboard:lab:${machine.labId}`).emit('machine:status-changed', { machine });
        }
      } else {
        await machine.save();
      }
    }

    const faultThreshold = new Date(Date.now() - 60 * 60 * 1000);
    const faultMachines = await Machine.find({
      status: 'offline',
      lastHeartbeat: { $lt: faultThreshold },
      offlineCount: { $gte: 3 },
    });

    for (const machine of faultMachines) {
      machine.status = 'fault';
      await machine.save();
      if (machine.labId) {
        getIO().to(`dashboard:lab:${machine.labId}`).emit('machine:status-changed', { machine });
      }
    }

    const activeSessions = await Session.find({ status: 'active' });
    for (const session of activeSessions) {
      const machine = await Machine.findById(session.machineId);
      if (machine && (machine.status === 'offline' || machine.status === 'fault')) {
        const lastHeartbeatAge = machine.lastHeartbeat
          ? Date.now() - new Date(machine.lastHeartbeat).getTime()
          : Infinity;
        if (lastHeartbeatAge > 30 * 60 * 1000) {
          session.endTime = new Date();
          session.durationSeconds = Math.round((session.endTime - session.startTime) / 1000);
          session.status = 'forcefully-terminated';
          await session.save();

          const attendance = await AttendanceRecord.findOne({ sessionId: session._id });
          if (attendance) {
            attendance.status = 'no-checkout';
            await attendance.save();
          }

          if (machine.labId) {
            getIO().to(`dashboard:lab:${machine.labId}`).emit('session:ended', { sessionId: session._id });
          }
        }
      }
    }

    console.log(`Stale cleanup done. Marked ${offlineMachines.filter(m => m.offlineCount >= 3).length} offline, ${faultMachines.length} fault.`);
  } catch (error) {
    console.error('Stale session cleanup error:', error.message);
  }
};