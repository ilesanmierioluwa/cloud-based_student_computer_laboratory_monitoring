const config = require('../config/env');
const { authenticate } = require('./auth');

const agentAuth = (req, res, next) => {
  const token = req.headers['x-agent-token'] || req.headers['x-registration-token'];

  if (!token || token !== config.agentRegistrationToken) {
    return res.status(401).json({ error: 'Invalid agent token' });
  }
  next();
};

module.exports = { agentAuth };