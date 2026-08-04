import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Policies() {
  const [policies, setPolicies] = useState([]);
  const [labs, setLabs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', type: 'blocked-app', rule: { processName: '' }, severity: 'medium', appliesToLabs: [], isActive: true,
  });

  useEffect(() => {
    api.get('/policies').then((res) => setPolicies(res.data.policies || [])).catch(() => {});
    api.get('/labs').then((res) => setLabs(res.data.labs || [])).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/policies', formData);
    setShowCreate(false);
    const res = await api.get('/policies');
    setPolicies(res.data.policies || []);
  };

  const handleToggle = async (id, isActive) => {
    await api.put(`/policies/${id}`, { isActive: !isActive });
    const res = await api.get('/policies');
    setPolicies(res.data.policies || []);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this policy?')) return;
    await api.delete(`/policies/${id}`);
    const res = await api.get('/policies');
    setPolicies(res.data.policies || []);
  };

  const ruleFields = {
    'blocked-app': [{ key: 'processName', label: 'Process Name', type: 'text' }, { key: 'appName', label: 'App Name', type: 'text' }],
    'blocked-website': [{ key: 'appName', label: 'Domain/URL', type: 'text' }],
    'usb-restriction': [{ key: 'usbClass', label: 'USB Class', type: 'text' }],
    'time-restriction': [{ key: 'allowedHoursStart', label: 'Start Time (HH:MM)', type: 'text' }, { key: 'allowedHoursEnd', label: 'End Time (HH:MM)', type: 'text' }],
    'idle-timeout': [{ key: 'idleMinutes', label: 'Idle Minutes', type: 'number' }],
  };

  return (
    <div>
      <div style={styles.header}>
        <h2>Access Control Policies</h2>
        <button onClick={() => setShowCreate(!showCreate)} style={styles.btn}>{showCreate ? 'Cancel' : 'Add Policy'}</button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input placeholder="Policy Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={styles.input} />
          <input placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={styles.input} />
          <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value, rule: {} })} style={styles.input}>
            <option value="blocked-app">Blocked App</option>
            <option value="blocked-website">Blocked Website</option>
            <option value="usb-restriction">USB Restriction</option>
            <option value="time-restriction">Time Restriction</option>
            <option value="idle-timeout">Idle Timeout</option>
          </select>
          {ruleFields[formData.type]?.map((f) => (
            <input key={f.key} placeholder={f.label} type={f.type} value={formData.rule?.[f.key] || ''} onChange={(e) => setFormData({ ...formData, rule: { ...formData.rule, [f.key]: f.type === 'number' ? parseInt(e.target.value) : e.target.value } })} style={styles.input} />
          ))}
          <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} style={styles.input}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
          <button type="submit" style={styles.btn}>Create Policy</button>
        </form>
      )}

      <div style={styles.list}>
        {policies.map((p) => (
          <div key={p._id} style={styles.card}>
            <div style={styles.cardHeader}>
              <h4 style={styles.cardTitle}>{p.name}</h4>
              <span style={{ ...styles.badge, background: p.severity === 'high' ? '#e74c3c' : p.severity === 'medium' ? '#f39c12' : '#3498db' }}>{p.severity}</span>
              <span style={{ ...styles.badge, background: p.isActive ? '#2ecc71' : '#95a5a6' }}>{p.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            <p style={styles.cardDesc}>{p.description}</p>
            <p style={styles.cardType}>Type: {p.type} | Rule: {JSON.stringify(p.rule)}</p>
            <div style={styles.cardActions}>
              <button onClick={() => handleToggle(p._id, p.isActive)} style={styles.toggleBtn}>{p.isActive ? 'Disable' : 'Enable'}</button>
              <button onClick={() => handleDelete(p._id)} style={styles.deleteBtn}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  btn: { padding: '10px 20px', background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' },
  form: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', flex: '1', minWidth: '150px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  cardTitle: { margin: '0', flex: '1', color: '#1a1a2e' },
  badge: { padding: '2px 8px', borderRadius: '4px', color: '#fff', fontSize: '11px', fontWeight: '600' },
  cardDesc: { margin: '0 0 4px 0', color: '#666', fontSize: '14px' },
  cardType: { margin: '0 0 8px 0', color: '#888', fontSize: '12px' },
  cardActions: { display: 'flex', gap: '8px' },
  toggleBtn: { padding: '6px 14px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  deleteBtn: { padding: '6px 14px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
};