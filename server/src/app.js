require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/env');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const labRoutes = require('./routes/labs');
const machineRoutes = require('./routes/machines');
const studentRoutes = require('./routes/students');
const sessionRoutes = require('./routes/sessions');
const policyRoutes = require('./routes/policies');
const violationRoutes = require('./routes/violations');
const commandRoutes = require('./routes/commands');
const attendanceRoutes = require('./routes/attendance');
const reportRoutes = require('./routes/reports');
const auditLogRoutes = require('./routes/auditLogs');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Try again later.' },
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/violations', violationRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Error handler
app.use(errorHandler);

module.exports = app;