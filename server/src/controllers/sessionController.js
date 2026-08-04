const { Session, Machine, Student, AttendanceRecord } = require('../models');
const { getIO } = require('../config/socket');

exports.start = async (req, res, next) => {
  try {
    const { machineId, matricNumber, loginMethod, courseCode, purpose } = req.body;

    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    const existingSession = await Session.findOne({ machineId, status: 'active' });
    if (existingSession) {
      return res.status(409).json({ error: 'Machine already has an active session.' });
    }

    let student = null;
    if (matricNumber) {
      student = await Student.findOne({ matricNumber: matricNumber.toUpperCase() });
      if (!student) {
        student = await Student.create({
          fullName: matricNumber,
          matricNumber: matricNumber.toUpperCase(),
        });
      }
    }

    const session = await Session.create({
      machineId: machine._id,
      studentId: student?._id || null,
      loginMethod: loginMethod || (matricNumber ? 'matric' : 'guest'),
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

    getIO().to(`dashboard:lab:${machine.labId}`).emit('session:started', { session, machine });
    getIO().to(`dashboard:lab:${machine.labId}`).emit('machine:status-changed', { machine });

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
};

exports.end = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Session is not active' });

    session.endTime = new Date();
    session.durationSeconds = Math.round((session.endTime - session.startTime) / 1000);
    session.status = 'ended';
    await session.save();

    const machine = await Machine.findById(session.machineId);
    if (machine) {
      machine.status = 'online';
      await machine.save();
      getIO().to(`dashboard:lab:${machine.labId}`).emit('machine:status-changed', { machine });
    }

    const attendance = await AttendanceRecord.findOne({ sessionId: session._id });
    if (attendance) {
      attendance.checkOutTime = new Date();
      attendance.status = 'present';
      await attendance.save();
    }

    getIO().to(`dashboard:lab:${machine?.labId}`).emit('session:ended', { sessionId: session._id });

    res.json({ session });
  } catch (error) {
    next(error);
  }
};

exports.forceEnd = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Session is not active' });

    session.endTime = new Date();
    session.durationSeconds = Math.round((session.endTime - session.startTime) / 1000);
    session.status = 'forcefully-terminated';
    await session.save();

    const machine = await Machine.findById(session.machineId);
    if (machine) {
      machine.status = 'online';
      await machine.save();
      getIO().to(`dashboard:lab:${machine.labId}`).emit('machine:status-changed', { machine });
    }

    const attendance = await AttendanceRecord.findOne({ sessionId: session._id });
    if (attendance) {
      attendance.checkOutTime = new Date();
      attendance.status = 'left-early';
      attendance.verifiedBy = 'manual';
      await attendance.save();
    }

    getIO().to(`dashboard:lab:${machine?.labId}`).emit('session:ended', { sessionId: session._id });

    res.json({ session });
  } catch (error) {
    next(error);
  }
};

exports.getByMachine = async (req, res, next) => {
  try {
    const sessions = await Session.find({ machineId: req.params.machineId })
      .populate('studentId', 'fullName matricNumber')
      .sort({ startTime: -1 })
      .limit(50);
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};

exports.getActive = async (req, res, next) => {
  try {
    const filter = { status: 'active' };
    if (req.query.labId) {
      const machines = await Machine.find({ labId: req.query.labId }).select('_id');
      filter.machineId = { $in: machines.map((m) => m._id) };
    }
    const sessions = await Session.find(filter)
      .populate('machineId', 'machineTag hostname labId')
      .populate('studentId', 'fullName matricNumber');
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
};