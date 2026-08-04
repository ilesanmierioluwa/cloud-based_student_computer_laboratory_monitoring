require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { connect, getSocket } = require('./socketClient');
const { collectSystemInfo } = require('./collectors/systemInfo');
const { getForegroundApp, getRunningProcesses } = require('./collectors/processMonitor');
const { startListening, isMassStorage } = require('./collectors/usbMonitor');
const { handlePolicySync, checkProcessAgainstPolicies, checkUSBDeviceAgainstPolicies, flushStaleViolations } = require('./collectors/policyEnforcer');
const { handleCommand } = require('./commandHandler');
const { startKiosk } = require('../kiosk/server');

const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL, 10) || 10000;
const TELEMETRY_INTERVAL = parseInt(process.env.TELEMETRY_INTERVAL, 10) || 15000;

let heartbeatInterval = null;
let telemetryInterval = null;

const start = async () => {
  console.log('=== Cloud Lab Monitoring Agent v1.0.0 ===');
  console.log(`Machine Tag: ${process.env.MACHINE_TAG || 'LAB1-PC01'}`);
  console.log(`Server: ${process.env.SERVER_URL || 'http://localhost:5000'}`);

  const socket = connect();

  socket.on('connect', () => {
    console.log('[Agent] Connected to central server');

    startHeartbeat();
    startTelemetry();

    socket.on('policy:sync', (data) => {
      handlePolicySync(data);
    });

    socket.on('command:execute', (data) => {
      handleCommand(data);
    });

    socket.on('config:update', (data) => {
      console.log('[Agent] Config update received:', data);
    });
  });

  // Start USB monitoring
  startListening(
    (device) => {
      checkUSBDeviceAgainstPolicies(device);
    },
    (device) => {
      console.log(`[USB] Device removed`);
    }
  );

  // Start self-service kiosk
  startKiosk();

  // Cleanup on shutdown
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

const startHeartbeat = () => {
  heartbeatInterval = setInterval(() => {
    const socket = getSocket();
    if (socket?.connected && socket.machineId) {
      socket.emit('heartbeat', {
        machineId: socket.machineId,
        timestamp: new Date().toISOString(),
      });
    }
  }, HEARTBEAT_INTERVAL);
};

const startTelemetry = async () => {
  telemetryInterval = setInterval(async () => {
    try {
      const socket = getSocket();
      if (!socket?.connected || !socket.machineId) return;

      const [sysInfo, foregroundApp, processes] = await Promise.all([
        collectSystemInfo(),
        getForegroundApp(),
        getRunningProcesses(),
      ]);

      // Check foreground app against policies
      checkProcessAgainstPolicies(foregroundApp);

      // Check running processes against policies
      if (processes.length > 0) {
        for (const proc of processes.slice(0, 20)) {
          checkProcessAgainstPolicies(proc.name);
        }
      }

      // Flush stale violation records
      flushStaleViolations();

      socket.emit('telemetry:update', {
        machineId: socket.machineId,
        ...sysInfo,
        foregroundApp,
      });
    } catch (error) {
      console.error('[Telemetry] Error:', error.message);
    }
  }, TELEMETRY_INTERVAL);
};

const shutdown = () => {
  console.log('[Agent] Shutting down...');
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  if (telemetryInterval) clearInterval(telemetryInterval);

  const socket = getSocket();
  if (socket) {
    socket.disconnect();
  }

  process.exit(0);
};

start();