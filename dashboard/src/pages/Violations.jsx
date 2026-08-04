import { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket, connectSocket } from '../services/socket';

export default function Violations() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadViolations = () => {
    api.get('/violations').then((res) => setViolations(res.data.violations || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadViolations();
    const socket = connectSocket();
    socket.on('alert:new', () => loadViolations());
    socket.on('alert:updated', () => loadViolations());
    return () => { socket.off('alert:new'); socket.off('alert:updated'); };
  }, []);

  const acknowledge = async (id) => {
    await api.patch(`/violations/${id}/acknowledge`);
    loadViolations();
  };

  const resolve = async (id) => {
    await api.patch(`/violations/${id}/resolve`);
    loadViolations();
  };

  const statusColor = (s) => ({ open: '#e74c3c', acknowledged: '#f39c12', resolved: '#2ecc71' }[s] || '#95a5a6');

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Policy Violations / Alerts</h2>
      <div style={styles.list}>
        {violations.length === 0 && <p style={{ color: '#888' }}>No violations to display</p>}
        {violations.map((v) => (
          <div key={v._id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={{ ...styles.badge, background: v.severity === 'high' ? '#e74c3c' : v.severity === 'medium' ? '#f39c12' : '#3498db' }}>{v.severity}</span>
              <span style={{ flex: 1, marginLeft: '8px', fontWeight: '600' }}>{v.type}</span>
              <span style={{ ...styles.statusBadge, background: statusColor(v.status) }}>{v.status}</span>
            </div>
            <p style={styles.detail}><strong>Detail:</strong> {v.detail}</p>
            <p style={styles.meta}>Machine: {v.machineId?.machineTag || 'N/A'} | Detected: {new Date(v.detectedAt).toLocaleString()} | Occurrences: {v.occurrenceCount}</p>
            {v.status === 'open' && <button onClick={() => acknowledge(v._id)} style={styles.ackBtn}>Acknowledge</button>}
            {v.status === 'acknowledged' && <button onClick={() => resolve(v._id)} style={styles.resolveBtn}>Resolve</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  cardHeader: { display: 'flex', alignItems: 'center', marginBottom: '8px' },
  badge: { padding: '2px 8px', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' },
  statusBadge: { padding: '2px 8px', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: '600' },
  detail: { margin: '0 0 4px 0', fontSize: '14px', color: '#333' },
  meta: { margin: '0 0 8px 0', fontSize: '12px', color: '#888' },
  ackBtn: { padding: '6px 14px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  resolveBtn: { padding: '6px 14px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
};