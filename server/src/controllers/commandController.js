const { RemoteCommandLog, Machine } = require('../models');
const { getIO } = require('../config/socket');

exports.issue = async (req, res, next) => {
  try {
    const { machineId, labId, commandType, payload } = req.body;

    let machines = [];
    if (machineId) {
      const machine = await Machine.findById(machineId);
      if (!machine) return res.status(404).json({ error: 'Machine not found' });
      machines = [machine];
    } else if (labId) {
      machines = await Machine.find({ labId, status: { $ne: 'offline' } });
      if (machines.length === 0) return res.status(400).json({ error: 'No online machines in this lab' });
    } else {
      return res.status(400).json({ error: 'machineId or labId is required' });
    }

    const commands = [];
    for (const machine of machines) {
      const command = await RemoteCommandLog.create({
        machineId: machine._id,
        issuedBy: req.user._id,
        commandType: commandType === 'broadcast' ? 'message' : commandType,
        payload,
        status: 'pending',
        issuedAt: new Date(),
      });

      if (machine.status !== 'offline') {
        getIO().to(machine._id.toString()).emit('command:execute', {
          commandId: command._id.toString(),
          commandType: command.commandType,
          payload: command.payload,
        });
        command.status = 'delivered';
        await command.save();
      }

      commands.push(command);
    }

    // Broadcast command completion notification
    for (const machine of machines) {
      if (machine.labId) {
        getIO().to(`dashboard:lab:${machine.labId}`).emit('command:status-changed', {
          commands: commands.filter(c => c.machineId.toString() === machine._id.toString()),
        });
      }
    }

    res.status(201).json({ commands, message: `${commands.length} command(s) issued` });
  } catch (error) {
    next(error);
  }
};

exports.acknowledge = async (req, res, next) => {
  try {
    const { commandId, status, message } = req.body;
    const command = await RemoteCommandLog.findById(commandId);
    if (!command) return res.status(404).json({ error: 'Command not found' });

    command.status = status || 'executed';
    command.executedAt = new Date();
    if (message) command.errorMessage = message;
    await command.save();

    const machine = await Machine.findById(command.machineId);
    if (machine?.labId) {
      getIO().to(`dashboard:lab:${machine.labId}`).emit('command:status-changed', { command });
    }

    res.json({ command });
  } catch (error) {
    next(error);
  }
};

exports.getByMachine = async (req, res, next) => {
  try {
    const commands = await RemoteCommandLog.find({ machineId: req.params.machineId })
      .populate('issuedBy', 'fullName email')
      .sort({ issuedAt: -1 })
      .limit(100);
    res.json({ commands });
  } catch (error) {
    next(error);
  }
};

exports.getPending = async (req, res, next) => {
  try {
    const commands = await RemoteCommandLog.find({ status: 'pending' })
      .populate('machineId', 'machineTag hostname labId')
      .sort({ issuedAt: -1 });
    res.json({ commands });
  } catch (error) {
    next(error);
  }
};