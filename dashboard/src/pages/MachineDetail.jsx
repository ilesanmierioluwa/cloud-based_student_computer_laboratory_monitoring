import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { getSocket, connectSocket } from '../services/socket';

export default function MachineDetail() {
  const [machines, setMachines] = useState([]);
  const [labs, setLabs] = useState([]);
  const [labFilter, setLabFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState({});
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [commandPayload, setCommandPayload] = useState({ message: '' });

  useEffect(() => {
    api.get('/labs').then((res) => setLabs(res.data.labs || [])).catch(() => {});
    loadMachines();

    const socket = connectSocket();
    socket.on('telemetry:live', (data) => {
      setTelemetry((prev) => ({ ...prev, [data.machineId]: data }));
    });
    socket.on('machine:status-changed', (data) => {
      setMachines((prev) => prev.map((m) => (m._id === data.machine._id ? { ...m, ...data.machine } : m)));
    });
    return () => { socket.off('telemetry:live'); socket.off('machine:status-changed'); };
  }, []);

  const loadMachines = useCallback(() => {
    const params = labFilter ? `?labId=${labFilter}` : '';
    api.get(`/machines${params}`).then((res) => setMachines(res.data.machines || [])).finally(() => setLoading(false));
  }, [labFilter]);

  useEffect(() => { loadMachines(); }, [labFilter, loadMachines]);

  const sendCommand = async (machineId, commandType) => {
    try {
      await api.post('/commands', { machineId, commandType, payload: commandPayload });
      alert('Command issued');
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const statusColor = (status) => {
    const colors = { 'in-use': '#2ecc71', online: '#3498db', offline: '#95a5a6', locked: '#f39c12', idle: '#f1c40f', fault: '#e74c3c' };
    return colors[status] || '#95a5a6';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h2>Machines</h2>
        <select value={labFilter} onChange={(e) => setLabFilter(e.target.value)} style={styles.select}>
          <option value="">All Labs</option>
          {labs.map((lab) => <option key={lab._id} value={lab._id}>{lab.name}</option>)}
        </select>
      </div>

      <div style={styles.grid}>
        {machines.map((machine) => {
          const live = telemetry[machine._id];
          return (
            <div key={machine._id} style={{ ...styles.card, borderLeft: `4px solid ${statusColor(machine.status)}` }} onClick={() => setSelectedMachine(machine)}>
              <div style={styles.tag}>{machine.machineTag}</div>
              <div style={styles.hostname}>{machine.hostname || machine.macAddress}</div>
              <div style={{ ...styles.status, color: statusColor(machine.status) }}>{machine.status}</div>
              {live && (
                <div style={styles.liveData}>
                  CPU: {live.cpuUsagePercent}% | RAM: {live.ramUsagePercent}% | {live.foregroundApp}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedMachine && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>{selectedMachine.machineTag} - Commands</h3>
            <input placeholder="Message" value={commandPayload.message} onChange={(e) => setCommandPayload({ message: e.target.value })} style={styles.input} />
            <div style={styles.commandBtns}>
              <button onClick={() => sendCommand(selectedMachine._id, 'message')} style={styles.cmdBtn}>Send Message</button>
              <button onClick={() => sendCommand(selectedMachine._id, 'lock')} style={styles.cmdBtn}>Lock</button>
              <button onClick={() => sendCommand(selectedMachine._id, 'unlock')} style={styles.cmdBtn}>Unlock</button>
              <button onClick={() => sendCommand(selectedMachine._id, 'shutdown')} style={{ ...styles.cmdBtn, background: '#e74c3c' }}>Shutdown</button>
              <button onClick={() => sendCommand(selectedMachine._id, 'restart')} style={{ ...styles.cmdBtn, background: '#f39c12' }}>Restart</button>
            </div>
            <button onClick={() => setSelectedMachine(null)} style={styles.closeBtn}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  select: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' },
  card: { background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer' },
  tag: { fontWeight: '700', color: '#1a1a2e', marginBottom: '4px' },
  hostname: { fontSize: '13px', color: '#888', marginBottom: '4px', wordBreak: 'break-all' },
  status: { fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' },
  liveData: { marginTop: '8px', fontSize: '12px', color: '#555', background: '#f8f9fa', padding: '4px 8px', borderRadius: '4px' },
  modal: { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '24px', borderRadius: '8px', minWidth: '300px', maxWidth: '500px' },
  input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '12px', boxSizing: 'border-box' },
  commandBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' },
  cmdBtn: { padding: '8px 14px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  closeBtn: { padding: '8px 14px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' },
};