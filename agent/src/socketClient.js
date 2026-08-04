const io = require('socket.io-client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'agent-registration-token-default-change-me';
const MACHINE_TAG = process.env.MACHINE_TAG || 'LAB1-PC01';
const LAB_ID = process.env.LAB_ID || null;

let socket = null;
let connected = false;
let reconnectAttempts = 0;

const connect = () => {
  if (socket?.connected) return socket;

  socket = io(SERVER_URL, {
    auth: { token: AGENT_TOKEN },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log(`[Socket] Connected to server (${SERVER_URL})`);
    connected = true;
    reconnectAttempts = 0;

    socket.emit('machine:register', {
      machineTag: MACHINE_TAG,
      hostname: require('os').hostname(),
      macAddress: getMacAddress(),
      labId: LAB_ID || undefined,
      os: `${require('os').type()} ${require('os').release()}`,
      agentVersion: '1.0.0',
    });
  });

  socket.on('machine:registered', (data) => {
    console.log(`[Socket] Machine registered with ID: ${data.machineId}`);
    socket.machineId = data.machineId;
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Disconnected: ${reason}`);
    connected = false;
  });

  socket.on('connect_error', (error) => {
    reconnectAttempts++;
    console.log(`[Socket] Connection error (attempt ${reconnectAttempts}): ${error.message}`);
  });

  return socket;
};

const getSocket = () => socket;
const isConnected = () => connected;

const getMacAddress = () => {
  try {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.mac;
        }
      }
    }
  } catch (e) {}
  return '00:00:00:00:00:00';
};

module.exports = { connect, getSocket, isConnected };