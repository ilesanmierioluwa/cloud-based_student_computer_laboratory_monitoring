import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Attendance() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [records, setRecords] = useState([]);
  const [labFilter, setLabFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [studentSessions, setStudentSessions] = useState([]);

  useEffect(() => {
    api.get('/labs').then((res) => setLabs(res.data.labs || [])).catch(() => {});
    loadAttendance();
  }, [labFilter, dateFilter]);

  const loadAttendance = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (labFilter) params.append('labId', labFilter);
    if (dateFilter) params.append('date', dateFilter);
    api.get(`/attendance?${params}`).then((res) => setRecords(res.data.records || [])).finally(() => setLoading(false));
  };

  const viewStudentDetails = async (studentId) => {
    const res = await api.get(`/attendance?studentId=${studentId}`);
    setStudentSessions(res.data.records || []);
    setViewingStudent(studentId);
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (labFilter) params.append('labId', labFilter);
    if (dateFilter) params.append('date', dateFilter);
    window.open(`${API_URL}/api/attendance/export/csv?${params}`, '_blank');
  };

  return (
    <div>
      <div style={styles.header}>
        <h2>Attendance Records</h2>
        <div style={styles.filters}>
          <select value={labFilter} onChange={(e) => setLabFilter(e.target.value)} style={styles.select}>
            <option value="">All Labs</option>
            {labs.map((lab) => <option key={lab._id} value={lab._id}>{lab.name}</option>)}
          </select>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={styles.dateInput} />
          <button onClick={exportCSV} style={styles.btn}>Export CSV</button>
          <button onClick={() => window.open(`${API_URL}/api/attendance/export/pdf?labId=${labFilter}&date=${dateFilter}`, '_blank')} style={styles.btn}>Export PDF</button>
        </div>
      </div>

      {loading ? <div>Loading...</div> : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Student</th>
              <th style={styles.th}>Matric No.</th>
              <th style={styles.th}>Lab</th>
              <th style={styles.th}>Check In</th>
              <th style={styles.th}>Check Out</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r._id}>
                <td style={styles.td}>{new Date(r.date).toLocaleDateString()}</td>
                <td style={styles.td}>{r.studentId?.fullName || 'Guest'}</td>
                <td style={styles.td}>{r.studentId?.matricNumber || 'N/A'}</td>
                <td style={styles.td}>{r.labId?.name || 'N/A'}</td>
                <td style={styles.td}>{new Date(r.checkInTime).toLocaleString()}</td>
                <td style={styles.td}>{r.checkOutTime ? new Date(r.checkOutTime).toLocaleString() : '—'}</td>
                <td style={styles.td}><span style={{ padding: '2px 8px', borderRadius: '4px', background: r.status === 'present' ? '#2ecc71' : r.status === 'left-early' ? '#f39c12' : '#e74c3c', color: '#fff', fontSize: '12px' }}>{r.status}</span></td>
                <td style={styles.td}><button onClick={() => viewStudentDetails(r.studentId?._id)} style={styles.viewBtn}>View History</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {viewingStudent && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Student Attendance History</h3>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Date</th><th style={styles.th}>Lab</th><th style={styles.th}>Check In</th><th style={styles.th}>Check Out</th><th style={styles.th}>Status</th></tr></thead>
              <tbody>
                {studentSessions.map((s) => (
                  <tr key={s._id}>
                    <td style={styles.td}>{new Date(s.date).toLocaleDateString()}</td>
                    <td style={styles.td}>{s.labId?.name}</td>
                    <td style={styles.td}>{new Date(s.checkInTime).toLocaleString()}</td>
                    <td style={styles.td}>{s.checkOutTime ? new Date(s.checkOutTime).toLocaleString() : '—'}</td>
                    <td style={styles.td}>{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setViewingStudent(null)} style={styles.closeBtn}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
  filters: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  select: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px' },
  dateInput: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px' },
  btn: { padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden' },
  th: { padding: '12px', background: '#1a1a2e', color: '#fff', textAlign: 'left', fontSize: '13px' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontSize: '13px' },
  viewBtn: { padding: '4px 10px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  modal: { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '700px', maxHeight: '80vh', overflow: 'auto' },
  closeBtn: { marginTop: '12px', padding: '10px 20px', background: '#95a5a6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};