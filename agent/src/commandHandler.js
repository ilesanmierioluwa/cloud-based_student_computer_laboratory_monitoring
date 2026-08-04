const os = require('os');

let pendingCommands = [];
let isExecuting = false;

const handleCommand = (data) => {
  pendingCommands.push(data);
  if (!isExecuting) processQueue();
};

const processQueue = async () => {
  if (pendingCommands.length === 0) {
    isExecuting = false;
    return;
  }

  isExecuting = true;
  const command = pendingCommands.shift();
  const { getSocket } = require('./socketClient');
  const socket = getSocket();

  try {
    console.log(`[Command] Executing: ${command.commandType}`);

    switch (command.commandType) {
      case 'lock':
        executeLock(command);
        break;
      case 'unlock':
        executeUnlock(command);
        break;
      case 'message':
        executeMessage(command);
        break;
      case 'shutdown':
        executeShutdown(command);
        break;
      case 'restart':
        executeRestart(command);
        break;
      case 'logout-session':
        executeLogout(command);
        break;
      default:
        socket.emit('command:ack', {
          commandId: command.commandId,
          status: 'failed',
          message: `Unknown command type: ${command.commandType}`,
        });
    }
  } catch (error) {
    socket.emit('command:ack', {
      commandId: command.commandId,
      status: 'failed',
      message: error.message,
    });
  }

  isExecuting = false;
  processQueue();
};

const executeLock = (command) => {
  const { getSocket } = require('./socketClient');
  const socket = getSocket();
  const platform = os.platform();

  if (platform === 'win32') {
    const { exec } = require('child_process');
    exec('rundll32.exe user32.dll,LockWorkStation', (err) => {
      if (err) {
        socket.emit('command:ack', { commandId: command.commandId, status: 'failed', message: err.message });
      } else {
        socket.emit('command:ack', { commandId: command.commandId, status: 'executed' });
      }
    });
  } else if (platform === 'linux') {
    const { exec } = require('child_process');
    exec('loginctl lock-session', (err) => {
      socket.emit('command:ack', {
        commandId: command.commandId,
        status: err ? 'failed' : 'executed',
        message: err?.message,
      });
    });
  } else {
    console.log('[Command] LOCK command received (not supported on this OS)');
    socket.emit('command:ack', { commandId: command.commandId, status: 'executed' });
  }
};

const executeUnlock = (command) => {
  const { getSocket } = require('./socketClient');
  const socket = getSocket();
  // Unlock typically requires credential re-entry
  console.log('[Command] UNLOCK command received (requires user credentials)');
  socket.emit('command:ack', { commandId: command.commandId, status: 'executed', message: 'Unlock acknowledged' });
};

const executeMessage = (command) => {
  const { getSocket } = require('./socketClient');
  const socket = getSocket();
  const message = command.payload?.message || 'Notification from lab admin';
  console.log(`[Command] MESSAGE: ${message}`);

  const platform = os.platform();
  if (platform === 'win32') {
    const { exec } = require('child_process');
    exec(`msg * "${message}"`, () => {});
  } else if (platform === 'linux') {
    const { exec } = require('child_process');
    exec(`notify-send "Lab Admin" "${message}" 2>/dev/null`, () => {});
  }

  socket.emit('command:ack', { commandId: command.commandId, status: 'executed' });
};

const executeShutdown = (command) => {
  const { getSocket } = require('./socketClient');
  const socket = getSocket();
  console.log('[Command] SHUTDOWN command received');

  const platform = os.platform();
  if (platform === 'win32') {
    const { exec } = require('child_process');
    exec('shutdown /s /t 60', () => {});
  } else if (platform === 'linux') {
    const { exec } = require('child_process');
    exec('shutdown -h +1', () => {});
  }

  socket.emit('command:ack', { commandId: command.commandId, status: 'executed' });
};

const executeRestart = (command) => {
  const { getSocket } = require('./socketClient');
  const socket = getSocket();
  console.log('[Command] RESTART command received');

  const platform = os.platform();
  if (platform === 'win32') {
    const { exec } = require('child_process');
    exec('shutdown /r /t 60', () => {});
  } else if (platform === 'linux') {
    const { exec } = require('child_process');
    exec('shutdown -r +1', () => {});
  }

  socket.emit('command:ack', { commandId: command.commandId, status: 'executed' });
};

const executeLogout = (command) => {
  const { getSocket } = require('./socketClient');
  const socket = getSocket();
  console.log('[Command] LOGOUT-SESSION command received');

  const { exec } = require('child_process');
  const platform = os.platform();
  if (platform === 'win32') {
    exec('shutdown /l', () => {});
  } else if (platform === 'linux') {
    exec('gnome-session-quit --no-prompt 2>/dev/null || loginctl terminate-session $XDG_SESSION_ID 2>/dev/null', () => {});
  }

  socket.emit('command:ack', { commandId: command.commandId, status: 'executed' });
};

module.exports = { handleCommand };