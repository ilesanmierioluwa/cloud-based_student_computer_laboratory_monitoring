import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function UserManagement() {
  const { user: currentUser, register } = useAuth();
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', staffId: '', email: '', password: '', role: 'technician' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data.users || [])).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await register(formData);
      setMessage('User created successfully');
      setShowCreate(false);
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      setMessage('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return;
    await api.delete(`/users/${id}`);
    const res = await api.get('/users');
    setUsers(res.data.users || []);
  };

  return (
    <div>
      <div style={styles.header}>
        <h2>User Management</h2>
        {currentUser?.role === 'admin' && <button onClick={() => setShowCreate(!showCreate)} style={styles.btn}>{showCreate ? 'Cancel' : 'Add User'}</button>}
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {showCreate && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required style={styles.input} />
          <input placeholder="Staff ID" value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })} required style={styles.input} />
          <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={styles.input} />
          <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required style={styles.input} />
          <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={styles.input}>
            <option value="technician">Technician</option>
            <option value="lecturer">Lecturer</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" style={styles.btn}>Create User</button>
        </form>
      )}

      <table style={styles.table}>
        <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Staff ID</th><th style={styles.th}>Email</th><th style={styles.th}>Role</th><th style={styles.th}>Status</th><th style={styles.th}>Actions</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td style={styles.td}>{u.fullName}</td>
              <td style={styles.td}>{u.staffId}</td>
              <td style={styles.td}>{u.email}</td>
              <td style={styles.td}><span style={{ ...styles.roleBadge, background: u.role === 'admin' ? '#e74c3c' : u.role === 'technician' ? '#3498db' : '#2ecc71' }}>{u.role}</span></td>
              <td style={styles.td}>{u.isActive ? 'Active' : 'Inactive'}</td>
              <td style={styles.td}>
                {currentUser?.role === 'admin' && u._id !== currentUser._id && (
                  <button onClick={() => handleDeactivate(u._id)} style={styles.deleteBtn}>Deactivate</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btn: { padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  form: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', flex: '1', minWidth: '150px' },
  message: { padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '8px', overflow: 'hidden' },
  th: { padding: '12px', background: '#1a1a2e', color: '#fff', textAlign: 'left', fontSize: '13px' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', fontSize: '13px' },
  roleBadge: { padding: '2px 8px', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' },
  deleteBtn: { padding: '4px 10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
};