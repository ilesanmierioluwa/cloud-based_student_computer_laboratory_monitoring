const cron = require('node-cron');
const { cleanStaleSessions } = require('../services/sessionService');

const initCronJobs = () => {
  // Clean stale sessions every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    cleanStaleSessions();
  });

  // Daily report generation placeholder (runs at 11:59 PM)
  cron.schedule('59 23 * * *', () => {
    console.log('Daily report generation triggered');
    // Future: generate and email daily report
  });

  console.log('Cron jobs initialized');
};

module.exports = { initCronJobs };