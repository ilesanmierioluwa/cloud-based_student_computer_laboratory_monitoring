const { getIO } = require('../config/socket');

const handleDashboardEvents = (socket) => {
  socket.on('join:lab', (labId) => {
    if (labId) {
      socket.join(`dashboard:lab:${labId}`);
      socket.join(`lab:${labId}`);
    }
  });

  socket.on('leave:lab', (labId) => {
    if (labId) {
      socket.leave(`dashboard:lab:${labId}`);
      socket.leave(`lab:${labId}`);
    }
  });

  socket.on('join:admin', () => {
    socket.join('admin:alerts');
  });

  socket.on('leave:admin', () => {
    socket.leave('admin:alerts');
  });
};

module.exports = { handleDashboardEvents };