const os = require('os');
let usbDetector = null;

try {
  usbDetector = require('usb-detection');
} catch (e) {
  console.log('[USB Monitor] usb-detection not available (non-Windows/missing native dep)');
}

const events = [];
let listeners = [];

const startListening = (onInsert, onRemove) => {
  if (!usbDetector) {
    console.log('[USB Monitor] USB detection disabled on this platform');
    return;
  }

  usbDetector.startMonitoring();

  usbDetector.on('add', (device) => {
    console.log(`[USB Monitor] Device added: ${JSON.stringify(device)}`);
    onInsert(device);
  });

  usbDetector.on('remove', (device) => {
    console.log(`[USB Monitor] Device removed: ${JSON.stringify(device)}`);
    onRemove(device);
  });

  usbDetector.on('change', (device) => {
    console.log(`[USB Monitor] Device changed: ${JSON.stringify(device)}`);
  });
};

const stopListening = () => {
  if (usbDetector) {
    usbDetector.stopMonitoring();
  }
};

const isMassStorage = (device) => {
  if (!device) return false;
  const deviceClass = device.deviceAddress || 0;
  return deviceClass === 8;
};

module.exports = { startListening, stopListening, isMassStorage };