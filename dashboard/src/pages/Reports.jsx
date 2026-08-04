import { useEffect, useState } from 'react';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [violationTrends, setViolationTrends] = useState([]);
  const [machineUtil, setMachineUtil] = useState([]);
  const [period, setPeriod] = useState('7');

  useEffect(() => {
    api.get('/reports/summary').then((res) => setSummary(res.data.summary)).catch(() => {});
    api.get(`/reports/usage?period=${period === '30' ? 'month' : 'week'}`).then((res) => setUsageData(res.data.usage || [])).catch(() => {});
    api.get(`/reports/violation-trends?days=${period}`).then((res) => setViolationTrends(res.data.trends || [])).catch(() => {});
    api.get('/reports/machine-utilization').then((res) => setMachineUtil(res.data.utilization || [])).catch(() => {});
  }, [period]);

  const summarizedViolations = {};
  violationTrends.forEach((t) => {
    const date = t._id.date;
    if (!summarizedViolations[date]) summarizedViolations[date] = { date, count: 0 };
    summarizedViolations[date].count += t.count;
  });

  return (
    <div>
      <div style={styles.header}>
        <h2>Reports & Analytics</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={styles.select}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>

      <div style={styles.cardGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary?.activeSessions || 0}</div>
          <div style={styles.statLabel}>Active Sessions</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary?.todayAttendance || 0}</div>
          <div style={styles.statLabel}>Today's Attendance</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary?.utilizationPercent || 0}%</div>
          <div style={styles.statLabel}>Lab Utilization</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary?.openViolations || 0}</div>
          <div style={styles.statLabel}>Open Violations</div>
        </div>
      </div>

      <div style={styles.chartContainer}>
        <h3>Sessions Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="_id" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#3498db" name="Sessions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.chartContainer}>
        <h3>Violation Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.values(summarizedViolations)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#e74c3c" name="Violations" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.chartContainer}>
        <h3>Machine Utilization</h3>
        <table style={styles.table}>
          <thead><tr><th style={styles.th}>Machine</th><th style={styles.th}>Sessions</th><th style={styles.th}>Total Duration (sec)</th></tr></thead>
          <tbody>
            {machineUtil.slice(0, 10).map((m) => (
              <tr key={m.machineId}>
                <td style={styles.td}>{m.machineTag}</td>
                <td style={styles.td}>{m.sessionCount}</td>
                <td style={styles.td}>{m.totalDurationSeconds || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  select: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' },
  statCard: { background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' },
  statValue: { fontSize: '28px', fontWeight: '700', color: '#1a1a2e' },
  statLabel: { fontSize: '13px', color: '#888' },
  chartContainer: { background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px', background: '#1a1a2e', color: '#fff', textAlign: 'left', fontSize: '13px' },
  td: { padding: '10px', borderBottom: '1px solid #f0f0f0', fontSize: '13px' },
};