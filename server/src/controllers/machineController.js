const { validationResult } = require('express-validator');
const { Machine, Laboratory } = require('../models');
const { getIO } = require('../config/socket');

exports.register = async (req, res, next) => {
  try {
    const { machineTag, hostname, macAddress, labId, os, agentVersion, ipAddress, specs } = req.body;

    let machine = await Machine.findOne({ machineTag });
    if (machine) {
      machine.hostname = hostname || machine.hostname;
      machine.macAddress = macAddress || machine.macAddress;
      machine.ipAddress = ipAddress || machine.ipAddress;
      machine.os = os || machine.os;
      machine.agentVersion = agentVersion || machine.agentVersion;
      machine.specs = specs || machine.specs;
      if (labId) machine.labId = labId;
      machine.status = 'online';
      machine.lastHeartbeat = new Date();
      machine.offlineCount = 0;
      await machine.save();
      return res.json({ machine, message: 'Machine re-registered successfully' });
    }

    if (labId) {
      const lab = await Laboratory.findById(labId);
      if (!lab) return res.status(400).json({ error: 'Laboratory not found' });
    }

    machine = await Machine.create({
      machineTag,
      hostname,
      macAddress,
      ipAddress,
      labId: labId || null,
      os,
      agentVersion,
      specs,
      status: 'online',
      lastHeartbeat: new Date(),
    });

    res.status(201).json({ machine, message: 'Machine registered successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.labId) filter.labId = req.query.labId;
    if (req.query.status) filter.status = req.query.status;

    const machines = await Machine.find(filter)
      .populate('labId', 'name location')
      .sort({ machineTag: 1 });
    res.json({ machines });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const machine = await Machine.findById(req.params.id).populate('labId', 'name location');
    if (!machine) return res.status(404).json({ error: 'Machine not found' });
    res.json({ machine });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const machine = await Machine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    getIO().to(`dashboard:lab:${machine.labId}`).emit('machine:status-changed', { machine });
    res.json({ machine });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const machine = await Machine.findByIdAndDelete(req.params.id);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });
    res.json({ message: 'Machine deleted' });
  } catch (error) {
    next(error);
  }
};

exports.heartbeat = async (req, res, next) => {
  try {
    const { machineId } = req.body;
    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    machine.lastHeartbeat = new Date();
    if (machine.status === 'offline' || machine.status === 'fault') {
      machine.status = 'idle';
      machine.offlineCount = 0;
    }
    await machine.save();
    res.json({ message: 'Heartbeat recorded' });
  } catch (error) {
    next(error);
  }
};