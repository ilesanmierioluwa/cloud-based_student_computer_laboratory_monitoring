const { Server } = require('socket.io');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join:lab', (labId) => {
      if (labId) {
        socket.join(`lab:${labId}`);
        socket.join(`dashboard:lab:${labId}`);
        console.log(`Socket ${socket.id} joined lab:${labId}`);
      }
    });

    socket.on('join:admin', () => {
      socket.join('admin:alerts');
      console.log(`Socket ${socket.id} joined admin:alerts`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };