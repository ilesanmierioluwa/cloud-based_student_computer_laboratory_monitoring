const { exec } = require('child_process');
const os = require('os');

const getForegroundApp = () => {
  return new Promise((resolve) => {
    const platform = os.platform();

    if (platform === 'win32') {
      exec('powershell "(Get-Process | Where-Object {$_.MainWindowTitle -ne \\"\\"} | Select-Object -First 1).ProcessName"', (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve('Unknown');
        } else {
          resolve(stdout.trim());
        }
      });
    } else if (platform === 'linux') {
      exec('xdotool getactivewindow getwindowname 2>/dev/null || echo "Unknown"', (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve('Unknown');
        } else {
          resolve(stdout.trim().substring(0, 100));
        }
      });
    } else if (platform === 'darwin') {
      exec('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"', (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve('Unknown');
        } else {
          resolve(stdout.trim());
        }
      });
    } else {
      resolve('Unknown');
    }
  });
};

const getRunningProcesses = () => {
  return new Promise((resolve) => {
    const platform = os.platform();
    if (platform === 'win32') {
      exec('tasklist /FO CSV /NH', (err, stdout) => {
        if (err) return resolve([]);
        const lines = stdout.trim().split('\n');
        const processes = lines.map((line) => {
          const parts = line.replace(/"/g, '').split(',');
          return { name: parts[0]?.trim() || '', pid: parseInt(parts[1]) || 0 };
        });
        resolve(processes);
      });
    } else if (platform === 'linux' || platform === 'darwin') {
      exec('ps aux --no-headers', (err, stdout) => {
        if (err) return resolve([]);
        const lines = stdout.trim().split('\n');
        const processes = lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          return { name: parts[10]?.split('/').pop() || '', pid: parseInt(parts[1]) || 0 };
        });
        resolve(processes);
      });
    } else {
      resolve([]);
    }
  });
};

module.exports = { getForegroundApp, getRunningProcesses };