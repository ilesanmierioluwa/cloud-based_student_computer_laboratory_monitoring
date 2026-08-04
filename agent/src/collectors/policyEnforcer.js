const os = require('os');
const { getSocket } = require('../socketClient');

const pendingPolicyViolations = new Map();

let policiesCache = [];

const handlePolicySync = (data) => {
  if (data.action === 'created') {
    const existing = policiesCache.findIndex((p) => p._id === data.policy._id);
    if (existing >= 0) {
      policiesCache[existing] = data.policy;
    } else {
      policiesCache.push(data.policy);
    }
  } else if (data.action === 'updated') {
    const idx = policiesCache.findIndex((p) => p._id === data.policy._id);
    if (idx >= 0) policiesCache[idx] = data.policy;
  } else if (data.action === 'deleted') {
    policiesCache = policiesCache.filter((p) => p._id !== data.policyId);
  }
  console.log(`[Policy Engine] Synced. Active policies: ${policiesCache.filter(p => p.isActive).length}`);
};

const checkProcessAgainstPolicies = (processName) => {
  const socket = getSocket();
  if (!socket?.machineId) return;

  const appBlockPolicies = policiesCache.filter(
    (p) => p.isActive && p.type === 'blocked-app'
  );

  for (const policy of appBlockPolicies) {
    const blockedName = policy.rule?.processName || policy.rule?.appName;
    if (!blockedName) continue;

    // Case-insensitive match
    const procLower = processName.toLowerCase();
    const blockedLower = blockedName.toLowerCase();

    // Check if process name matches or contains the blocked name
    if (procLower === blockedLower || procLower.includes(blockedLower.split('.')[0])) {
      // Check debounce - only report if not already reported within 5 minutes
      const key = `${policy._id}_${processName}`;
      const lastReported = pendingPolicyViolations.get(key);
      if (lastReported && Date.now() - lastReported < 5 * 60 * 1000) {
        continue;
      }

      pendingPolicyViolations.set(key, Date.now());

      socket.emit('violation:report', {
        machineId: socket.machineId,
        policyId: policy._id.toString(),
        type: 'blocked-app',
        detail: `Blocked process detected: ${processName}`,
        severity: policy.severity,
      });

      console.log(`[Policy Engine] VIOLATION: ${processName} - ${policy.name}`);
    }
  }
};

const checkUSBDeviceAgainstPolicies = (device) => {
  const socket = getSocket();
  if (!socket?.machineId) return;

  const usbPolicies = policiesCache.filter(
    (p) => p.isActive && p.type === 'usb-restriction'
  );

  for (const policy of usbPolicies) {
    const key = `${policy._id}_usb`;
    const lastReported = pendingPolicyViolations.get(key);
    if (lastReported && Date.now() - lastReported < 5 * 60 * 1000) {
      continue;
    }

    pendingPolicyViolations.set(key, Date.now());

    socket.emit('violation:report', {
      machineId: socket.machineId,
      policyId: policy._id.toString(),
      type: 'usb-restriction',
      detail: `USB device connected: ${device.deviceName || 'Unknown device'}`,
      severity: policy.severity,
    });

    console.log(`[Policy Engine] USB VIOLATION: ${device.deviceName}`);
  }
};

const flushStaleViolations = () => {
  const FIVE_MINUTES = 5 * 60 * 1000;
  for (const [key, timestamp] of pendingPolicyViolations) {
    if (Date.now() - timestamp > FIVE_MINUTES) {
      pendingPolicyViolations.delete(key);
    }
  }
};

const getPolicies = () => policiesCache;
const setPolicies = (polices) => { policiesCache = policies; };

module.exports = {
  handlePolicySync,
  checkProcessAgainstPolicies,
  checkUSBDeviceAgainstPolicies,
  flushStaleViolations,
  getPolicies,
  setPolicies,
};