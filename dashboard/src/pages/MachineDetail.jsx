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
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionForm, setSessionForm] = useState({ matricNumber: '', courseCode: '', purpose: '' });

  const loadActiveSession = useCallback(async (machine) => {
    if (!machine) return;
    try {
      const res = await api.get(`/sessions/machine/${machine._id}`);
      const active = (res.data.sessions || []).find((s) => s.status === 'active');
      setActiveSession(active || null);
    } catch {
      setActiveSession(null);
    }
  }, []);

  useEffect(() => {
    if (selectedMachine) loadActiveSession(selectedMachine);
  }, [selectedMachine, loadActiveSession]);

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
    socket.on('session:started', (data) => {
      if (selectedMachine && data.machine?._id === selectedMachine._id) {
        setActiveSession(data.session);
      }
    });
    socket.on('session:ended', (data) => {
      if (selectedMachine && data.machine?._id === selectedMachine._id) {
        setActiveSession(null);
      }
    });
    return () => { socket.off('telemetry:live'); socket.off('machine:status-changed'); socket.off('session:started'); socket.off('session:ended'); };
  }, [selectedMachine]);

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

  const startSession = async () => {
    if (!sessionForm.matricNumber.trim()) {
      alert('Enter a matric number');
      return;
    }
    setSessionLoading(true);
    try {
      await api.post('/sessions/dashboard/start', {
        machineId: selectedMachine._id,
        matricNumber: sessionForm.matricNumber.trim(),
        courseCode: sessionForm.courseCode.trim() || undefined,
        purpose: sessionForm.purpose.trim() || undefined,
      });
      alert('Session started — attendance recorded');
      setSessionForm({ matricNumber: '', courseCode: '', purpose: '' });
      loadActiveSession(selectedMachine);
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSessionLoading(false);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setSessionLoading(true);
    try {
      await api.post(`/sessions/dashboard/${activeSession._id}/end`);
      alert('Session ended — check-out recorded');
      setActiveSession(null);
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSessionLoading(false);
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
            <h3>{selectedMachine.machineTag} - Machine</h3>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Attendance / Session</h4>
              {activeSession ? (
                <div style={styles.activeSession}>
                  <div><strong>{activeSession.studentId?.matricNumber || 'Active'}</strong></div>
                  <div style={styles.sessionDetail}>Started: {new Date(activeSession.startTime).toLocaleString()}</div>
                  {activeSession.courseCode && <div style={styles.sessionDetail}>Course: {activeSession.courseCode}</div>}
                  <button onClick={endSession} disabled={sessionLoading} style={styles.endBtn}>
                    {sessionLoading ? 'Working…' : 'End Session'}
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    placeholder="Matric number (e.g. 21CSC101)"
                    value={sessionForm.matricNumber}
                    onChange={(e) => setSessionForm({ ...sessionForm, matricNumber: e.target.value })}
                    style={styles.input}
                  />
                  <input
                    placeholder="Course code (optional)"
                    value={sessionForm.courseCode}
                    onChange={(e) => setSessionForm({ ...sessionForm, courseCode: e.target.value })}
                    style={styles.input}
                  />
                  <input
                    placeholder="Purpose (optional)"
                    value={sessionForm.purpose}
                    onChange={(e) => setSessionForm({ ...sessionForm, purpose: e.target.value })}
                    style={styles.input}
                  />
                  <button onClick={startSession} disabled={sessionLoading} style={styles.startBtn}>
                    {sessionLoading ? 'Working…' : 'Start Session (Mark Attendance)'}
                  </button>
                </div>
              )}
            </div>

            <div style={styles.section}>
              <h4 style={styles.sectionTitle}>Remote Commands</h4>
              <input placeholder="Message" value={commandPayload.message} onChange={(e) => setCommandPayload({ message: e.target.value })} style={styles.input} />
              <div style={styles.commandBtns}>
                <button onClick={() => sendCommand(selectedMachine._id, 'message')} style={styles.cmdBtn}>Send Message</button>
                <button onClick={() => sendCommand(selectedMachine._id, 'lock')} style={styles.cmdBtn}>Lock</button>
                <button onClick={() => sendCommand(selectedMachine._id, 'unlock')} style={styles.cmdBtn}>Unlock</button>
                <button onClick={() => sendCommand(selectedMachine._id, 'shutdown')} style={{ ...styles.cmdBtn, background: '#e74c3c' }}>Shutdown</button>
                <button onClick={() => sendCommand(selectedMachine._id, 'restart')} style={{ ...styles.cmdBtn, background: '#f39c12' }}>Restart</button>
              </div>
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
  modalContent: { background: '#fff', padding: '24px', borderRadius: '8px', minWidth: '300px', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' },
  input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '12px', boxSizing: 'border-box' },
  commandBtns: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' },
  cmdBtn: { padding: '8px 14px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  closeBtn: { padding: '8px 14px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' },
  section: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '16px' },
  sectionTitle: { margin: '0 0 10px', fontSize: '14px', color: '#374151' },
  activeSession: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '8px' },
  sessionDetail: { fontSize: '12px', color: '#6b7280', marginTop: '4px' },
  startBtn: { padding: '10px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', width: '100%', fontWeight: '600' },
  endBtn: { padding: '10px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', width: '100%', marginTop: '10px', fontWeight: '600' },
};