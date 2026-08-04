const si = require('systeminformation');
const os = require('os');

const collectSystemInfo = async () => {
  try {
    const [cpuLoad, mem, diskInfo, currentLoad, networkStats, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.currentLoad(),
      si.networkStats(),
      si.time(),
    ]);

    const cpuUsagePercent = Math.round(cpuLoad.currentLoad * 10) / 10;
    const ramUsagePercent = Math.round((mem.used / mem.total) * 1000) / 10;
    
    let diskUsagePercent = 0;
    if (diskInfo && diskInfo.length > 0) {
      const mainDisk = diskInfo[0];
      diskUsagePercent = Math.round((mainDisk.used / mainDisk.size) * 1000) / 10;
    }

    let networkUpKbps = 0;
    let networkDownKbps = 0;
    if (networkStats && networkStats.length > 0) {
      const mainNet = networkStats[0];
      networkUpKbps = Math.round(mainNet.tx_sec * 8);
      networkDownKbps = Math.round(mainNet.rx_sec * 8);
    }

    return {
      cpuUsagePercent,
      ramUsagePercent,
      diskUsagePercent,
      networkUpKbps,
      networkDownKbps,
      uptimeSeconds: os.uptime(),
    };
  } catch (error) {
    console.error('[Collector] System info error:', error.message);
    return {
      cpuUsagePercent: 0,
      ramUsagePercent: 0,
      diskUsagePercent: 0,
      networkUpKbps: 0,
      networkDownKbps: 0,
      uptimeSeconds: os.uptime(),
    };
  }
};

module.exports = { collectSystemInfo };