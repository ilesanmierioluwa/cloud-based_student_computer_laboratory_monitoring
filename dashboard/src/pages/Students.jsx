import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({ fullName: '', matricNumber: '', department: '', level: '' });
  const [editing, setEditing] = useState(null);
  const canEdit = user?.role === 'admin' || user?.role === 'technician';

  const loadStudents = () => {
    api.get('/students')
      .then((res) => setStudents(res.data.students || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStudents(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/students/${editing._id}`, formData);
        setMessage('Student updated successfully');
      } else {
        await api.post('/students', formData);
        setMessage('Student created successfully');
      }
      setShowCreate(false);
      setEditing(null);
      setFormData({ fullName: '', matricNumber: '', department: '', level: '' });
      loadStudents();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const startEdit = (student) => {
    setEditing(student);
    setFormData({ fullName: student.fullName, matricNumber: student.matricNumber, department: student.department || '', level: student.level || '' });
    setShowCreate(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student record?')) return;
    try {
      await api.delete(`/students/${id}`);
      setMessage('Student deleted');
      loadStudents();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h2>Students</h2>
        {canEdit && (
          <button
            onClick={() => { setShowCreate(!showCreate); setEditing(null); setFormData({ fullName: '', matricNumber: '', department: '', level: '' }); }}
            style={styles.btn}
          >
            {showCreate ? 'Cancel' : 'Add Student'}
          </button>
        )}
      </div>

      <div style={styles.info}>
        <strong>How students get added:</strong> They are auto-created when a session starts with their matric number on a lab PC, or you can register them manually here.
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {showCreate && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required style={styles.input} />
          <input placeholder="Matric Number (e.g. CSC/2020/001)" value={formData.matricNumber} onChange={(e) => setFormData({ ...formData, matricNumber: e.target.value })} required style={styles.input} />
          <input placeholder="Department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} style={styles.input} />
          <input placeholder="Level (e.g. 400)" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} style={styles.input} />
          <button type="submit" style={styles.btn}>{editing ? 'Update Student' : 'Create Student'}</button>
        </form>
      )}

      <div style={styles.stats}>
        Total Students: <strong>{students.length}</strong>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Full Name</th>
            <th style={styles.th}>Matric Number</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Level</th>
            <th style={styles.th}>Created</th>
            {canEdit && <th style={styles.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s._id}>
              <td style={styles.td}>{s.fullName}</td>
              <td style={styles.td}>{s.matricNumber}</td>
              <td style={styles.td}>{s.department || '—'}</td>
              <td style={styles.td}>{s.level || '—'}</td>
              <td style={styles.td}>{new Date(s.createdAt).toLocaleDateString()}</td>
              {canEdit && (
                <td style={styles.td}>
                  <button onClick={() => startEdit(s)} style={styles.editBtn}>Edit</button>
                  <button onClick={() => handleDelete(s._id)} style={styles.deleteBtn}>Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  btn: { padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  info: { background: '#e8f4fd', border: '1px solid #b8daff', color: '#0c5460', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' },
  message: { padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '16px' },
  form: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', flex: '1', minWidth: '150px' },
  stats: { marginBottom: '12px', fontSize: '14px', color: '#555' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden' },
  th: { padding: '12px', background: '#1a1a2e', color: '#fff', textAlign: 'left', fontSize: '13px' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontSize: '13px' },
  editBtn: { padding: '4px 10px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' },
  deleteBtn: { padding: '4px 10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
};