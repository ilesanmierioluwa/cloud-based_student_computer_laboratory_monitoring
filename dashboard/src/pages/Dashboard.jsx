import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket, connectSocket } from '../services/socket';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    api.get('/reports/summary').then((res) => setSummary(res.data.summary)).catch(() => {});
    api.get('/violations?status=open').then((res) => setAlerts(res.data.violations || [])).catch(() => {});

    const socket = connectSocket();
    setSocketConnected(socket.connected);

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('alert:new', (data) => setAlerts((prev) => [data.violation, ...prev.slice(0, 19)]));

    if (user?.role === 'admin' || user?.role === 'technician') {
      socket.emit('join:admin');
    }

    return () => { socket.off('alert:new'); };
  }, []);

  const stats = summary || {};
  const cards = [
    { label: 'Total Machines', value: stats.totalMachines || 0, color: '#3498db' },
    { label: 'Online', value: stats.onlineMachines || 0, color: '#2ecc71' },
    { label: 'Active Sessions', value: stats.activeSessions || 0, color: '#f39c12' },
    { label: 'Open Violations', value: stats.openViolations || 0, color: '#e74c3c' },
    { label: 'Labs', value: stats.totalLabs || 0, color: '#9b59b6' },
    { label: 'Today Attendance', value: stats.todayAttendance || 0, color: '#1abc9c' },
  ];

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.heading}>Dashboard Overview</h2>
        <span style={{ ...styles.status, background: socketConnected ? '#2ecc71' : '#e74c3c' }}>
          {socketConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>
      <div style={styles.cardGrid}>
        {cards.map((c, i) => (
          <div key={i} style={{ ...styles.card, borderTop: `4px solid ${c.color}` }}>
            <div style={styles.cardValue}>{c.value}</div>
            <div style={styles.cardLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      <h3 style={styles.sectionTitle}>Recent Alerts</h3>
      <div style={styles.alertList}>
        {alerts.length === 0 && <p style={{ color: '#888' }}>No open violations</p>}
        {alerts.slice(0, 10).map((alert) => (
          <div key={alert._id} style={styles.alertRow}>
            <span style={{ background: alert.severity === 'high' ? '#e74c3c' : alert.severity === 'medium' ? '#f39c12' : '#3498db', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{alert.severity}</span>
            <span style={{ flex: 1, marginLeft: '12px' }}>{alert.detail}</span>
            <span style={{ color: '#888', fontSize: '12px' }}>{new Date(alert.detectedAt).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div style={styles.quickLinks}>
        <Link to="/labs" style={styles.quickLink}>Manage Labs</Link>
        <Link to="/machines" style={styles.quickLink}>View Machines</Link>
        <Link to="/attendance" style={styles.quickLink}>Attendance</Link>
        <Link to="/policies" style={styles.quickLink}>Policies</Link>
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  heading: { margin: '0', color: '#1a1a2e' },
  status: { padding: '4px 12px', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: '600' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' },
  card: { background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  cardValue: { fontSize: '32px', fontWeight: '700', color: '#1a1a2e' },
  cardLabel: { fontSize: '14px', color: '#888', marginTop: '4px' },
  sectionTitle: { color: '#1a1a2e', marginBottom: '12px' },
  alertList: { background: '#fff', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  alertRow: { display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
  quickLinks: { display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' },
  quickLink: { padding: '10px 20px', background: '#1a1a2e', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '14px' },
};