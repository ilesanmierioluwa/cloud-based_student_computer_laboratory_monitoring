require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket, getIO } = require('./config/socket');
const { handleAgentEvents } = require('./sockets/agentHandlers');
const { handleDashboardEvents } = require('./sockets/dashboardHandlers');
const { initCronJobs } = require('./jobs/cronJobs');
const config = require('./config/env');

const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Wire up socket handlers
io.on('connection', (socket) => {
  handleAgentEvents(socket);
  handleDashboardEvents(socket);
});

// Seed admin user if not exists
const seedAdmin = async () => {
  const User = require('./models/User');
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (!existingAdmin) {
    await User.create({
      fullName: 'System Administrator',
      staffId: 'ADMIN001',
      email: 'admin@labmonitoring.com',
      passwordHash: 'admin123',
      role: 'admin',
      isActive: true,
    });
    console.log('Default admin user created (admin@labmonitoring.com / admin123)');
  }
};

// Start server
const start = async () => {
  let connected = false;
  while (!connected) {
    try {
      await connectDB();
      connected = true;
    } catch (error) {
      console.error(`DB connection failed, retrying in 10s... ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
  await seedAdmin();
  initCronJobs();

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
};

process.on('unhandledRejection', (reason) => {
  if (reason?.name === 'MongoNetworkError' || reason?.name === 'MongoServerSelectionError') {
    console.warn('Transient MongoDB error ignored:', reason.message);
  } else {
    console.error('Unhandled rejection:', reason);
  }
});

process.on('uncaughtException', (err) => {
  if (err?.name === 'MongoNetworkError' || err?.name === 'MongoServerSelectionError') {
    console.warn('Transient MongoDB error ignored:', err.message);
  } else {
    console.error('Uncaught exception:', err);
  }
});

start();