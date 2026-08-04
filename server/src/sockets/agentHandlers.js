const { Machine, Session, AttendanceRecord, ViolationLog } = require('../models');
const { getIO } = require('../config/socket');

const handleAgentEvents = (socket) => {
  let machineId = null;
  let labId = null;

  socket.on('machine:register', async (data) => {
    try {
      const { machineTag, hostname, macAddress, labId: agentLabId } = data;
      let machine = await Machine.findOne({ machineTag });

      if (machine) {
        machine.hostname = hostname || machine.hostname;
        machine.macAddress = macAddress || machine.macAddress;
        machine.status = 'online';
        machine.lastHeartbeat = new Date();
        machine.offlineCount = 0;
        if (agentLabId) machine.labId = agentLabId;
        await machine.save();
      } else {
        machine = await Machine.create({
          machineTag,
          hostname,
          macAddress,
          labId: agentLabId || null,
          status: 'online',
          lastHeartbeat: new Date(),
        });
      }

      machineId = machine._id.toString();
      labId = machine.labId?.toString() || null;

      socket.join(machineId);
      if (labId) {
        socket.join(`lab:${labId}`);
        socket.join(`dashboard:lab:${labId}`);
      }

      getIO().to(`dashboard:lab:${labId}`).emit('machine:status-changed', { machine });
      socket.emit('machine:registered', { machineId, machine });
    } catch (error) {
      socket.emit('error', { message: 'Registration failed', error: error.message });
    }
  });

  socket.on('heartbeat', async (data) => {
    try {
      const mId = data.machineId || machineId;
      if (!mId) return;

      const machine = await Machine.findById(mId);
      if (!machine) return;

      machine.lastHeartbeat = new Date();
      machine.offlineCount = 0;
      if (machine.status === 'offline' || machine.status === 'fault') {
        machine.status = 'idle';
      }
      await machine.save();
    } catch (error) {
      // Silent
    }
  });

  socket.on('telemetry:update', async (data) => {
    try {
      const mId = data.machineId || machineId;
      if (!mId) return;

      const Telemetry = require('../models/Telemetry');
      const telemetry = await Telemetry.create({
        machineId: mId,
        timestamp: new Date(),
        cpuUsagePercent: data.cpuUsagePercent,
        ramUsagePercent: data.ramUsagePercent,
        diskUsagePercent: data.diskUsagePercent,
        foregroundApp: data.foregroundApp,
        networkUpKbps: data.networkUpKbps,
        networkDownKbps: data.networkDownKbps,
        uptimeSeconds: data.uptimeSeconds,
      });

      if (labId) {
        getIO().to(`dashboard:lab:${labId}`).emit('telemetry:live', {
          machineId: mId,
          ...data,
          timestamp: telemetry.timestamp,
        });
      }
    } catch (error) {
      // Silent
    }
  });

  socket.on('session:start', async (data) => {
    try {
      const mId = data.machineId || machineId;
      if (!mId) return;

      const { matricNumber, courseCode, purpose } = data;
      const Student = require('../models/Student');
      const Session = require('../models/Session');
      const Machine = require('../models/Machine');

      const machine = await Machine.findById(mId);
      if (!machine) {
        socket.emit('error', { message: 'Machine not found' });
        return;
      }

      const existingSession = await Session.findOne({ machineId: mId, status: 'active' });
      if (existingSession) {
        socket.emit('error', { message: 'Machine already has an active session' });
        return;
      }

      let student = null;
      if (matricNumber) {
        student = await Student.findOne({ matricNumber: matricNumber.toUpperCase() });
        if (!student) {
          student = await Student.create({ fullName: matricNumber, matricNumber: matricNumber.toUpperCase() });
        }
      }

      const session = await Session.create({
        machineId: mId,
        studentId: student?._id || null,
        loginMethod: matricNumber ? 'matric' : 'guest',
        startTime: new Date(),
        status: 'active',
        courseCode,
        purpose,
      });

      machine.status = 'in-use';
      await machine.save();

      if (student && machine.labId) {
        await AttendanceRecord.create({
          sessionId: session._id,
          studentId: student._id,
          labId: machine.labId,
          date: new Date(),
          checkInTime: new Date(),
          verifiedBy: 'system',
          status: 'present',
        });
      }

      socket.emit('session:started', { session, sessionId: session._id.toString() });

      if (labId) {
        getIO().to(`dashboard:lab:${labId}`).emit('session:started', { session, machine });
        getIO().to(`dashboard:lab:${labId}`).emit('machine:status-changed', { machine });
      }
    } catch (error) {
      socket.emit('error', { message: 'Session start failed', error: error.message });
    }
  });

  socket.on('session:end', async (data) => {
    try {
      const { sessionId: sId } = data;
      if (!sId) return;

      const Session = require('../models/Session');
      const session = await Session.findById(sId);
      if (!session || session.status !== 'active') return;

      session.endTime = new Date();
      session.durationSeconds = Math.round((session.endTime - session.startTime) / 1000);
      session.status = 'ended';
      await session.save();

      const machine = await Machine.findById(session.machineId);
      if (machine) {
        machine.status = 'online';
        await machine.save();
      }

      const attendance = await AttendanceRecord.findOne({ sessionId: session._id });
      if (attendance) {
        attendance.checkOutTime = new Date();
        attendance.status = 'present';
        await attendance.save();
      }

      if (labId) {
        getIO().to(`dashboard:lab:${labId}`).emit('session:ended', { sessionId: session._id });
        if (machine) getIO().to(`dashboard:lab:${labId}`).emit('machine:status-changed', { machine });
      }
    } catch (error) {
      // Silent
    }
  });

  socket.on('violation:report', async (data) => {
    try {
      const mId = data.machineId || machineId;
      if (!mId) return;

      const { policyId, type, detail, severity } = data;
      const FIVE_MINUTES = 5 * 60 * 1000;

      const existingViolation = await ViolationLog.findOne({
        machineId: mId,
        policyId,
        status: 'open',
        detectedAt: { $gte: new Date(Date.now() - FIVE_MINUTES) },
      });

      if (existingViolation) {
        existingViolation.occurrenceCount += 1;
        await existingViolation.save();
        return;
      }

      const violation = await ViolationLog.create({
        machineId: mId,
        sessionId: data.sessionId,
        policyId,
        type,
        detail,
        severity: severity || 'medium',
        status: 'open',
        detectedAt: new Date(),
      });

      getIO().to('admin:alerts').emit('alert:new', { violation });
      if (labId) {
        getIO().to(`dashboard:lab:${labId}`).emit('alert:new', { violation });
      }
    } catch (error) {
      // Silent
    }
  });

  socket.on('command:ack', async (data) => {
    try {
      const { commandId, status, message } = data;
      const RemoteCommandLog = require('../models/RemoteCommandLog');
      const command = await RemoteCommandLog.findById(commandId);
      if (!command) return;

      command.status = status || 'executed';
      command.executedAt = new Date();
      if (message) command.errorMessage = message;
      await command.save();

      const machine = await Machine.findById(command.machineId);
      if (machine?.labId) {
        getIO().to(`dashboard:lab:${machine.labId}`).emit('command:status-changed', { command });
      }
    } catch (error) {
      // Silent
    }
  });

  socket.on('disconnect', async () => {
    if (machineId) {
      const machine = await Machine.findById(machineId);
      if (machine) {
        machine.offlineCount = (machine.offlineCount || 0) + 1;
        await machine.save();
      }
    }
  });
};

module.exports = { handleAgentEvents };