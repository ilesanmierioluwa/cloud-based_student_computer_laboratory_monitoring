const path = require('path');
const express = require('express');
const axios = require('axios');

const KIOSK_PORT = parseInt(process.env.KIOSK_PORT, 10) || 3001;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'agent-registration-token-default-change-me';

let server = null;

const startKiosk = () => {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  const { getSocket } = require('../src/socketClient');

  const api = (endpoint, data) =>
    axios.post(`${SERVER_URL}/api${endpoint}`, data, {
      headers: { 'x-agent-token': AGENT_TOKEN },
    });

  app.get('/api/status', async (req, res) => {
    const socket = getSocket();
    const machineId = socket?.machineId;

    const base = {
      connected: false,
      machineTag: process.env.MACHINE_TAG || 'UNKNOWN',
      online: Boolean(socket?.connected),
      session: null,
    };

    if (!machineId) return res.json(base);

    try {
      const { data } = await api('/sessions/status', { machineId });
      res.json({
        ...base,
        connected: true,
        machineId,
        machine: data.machine,
        session: data.session || null,
      });
    } catch (error) {
      res.json({
        ...base,
        connected: true,
        machineId,
        error: error.response?.data?.error || error.message,
      });
    }
  });

  app.post('/api/start', async (req, res) => {
    const { matricNumber, courseCode, purpose } = req.body || {};
    const socket = getSocket();
    const machineId = socket?.machineId;

    if (!matricNumber || !matricNumber.trim()) {
      return res.status(400).json({ error: 'Matric number is required' });
    }
    if (!machineId) {
      return res.status(503).json({ error: 'Agent is not registered with the server yet. Please wait a moment.' });
    }

    try {
      const { data } = await api('/sessions/start', {
        machineId,
        matricNumber: matricNumber.trim().toUpperCase(),
        loginMethod: 'matric',
        courseCode: courseCode?.trim() || undefined,
        purpose: purpose?.trim() || undefined,
      });
      res.status(201).json(data);
    } catch (error) {
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message,
      });
    }
  });

  app.post('/api/end', async (req, res) => {
    const socket = getSocket();
    const machineId = socket?.machineId;

    if (!machineId) {
      return res.status(503).json({ error: 'Agent is not registered with the server yet.' });
    }

    try {
      const { data: statusData } = await api('/sessions/status', { machineId });
      const session = statusData.session;
      if (!session) return res.status(400).json({ error: 'No active session on this machine.' });

      const { data } = await api(`/sessions/${session._id}/end`, {});
      res.json(data);
    } catch (error) {
      res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message,
      });
    }
  });

  server = app.listen(KIOSK_PORT, '0.0.0.0', () => {
    console.log(`[Kiosk] Self-service kiosk running at http://localhost:${KIOSK_PORT}`);
  });

  return server;
};

module.exports = { startKiosk };
