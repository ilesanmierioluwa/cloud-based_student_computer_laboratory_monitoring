import { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket, connectSocket } from '../services/socket';

export default function LabOverview() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', capacity: 30 });

  const fetchLabs = () => api.get('/labs').then((res) => setLabs(res.data.labs)).finally(() => setLoading(false));

  useEffect(() => { fetchLabs(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/labs', formData);
    setShowCreate(false);
    setFormData({ name: '', location: '', capacity: 30 });
    fetchLabs();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    await api.delete(`/labs/${id}`);
    fetchLabs();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h2>Laboratories</h2>
        <button onClick={() => setShowCreate(!showCreate)} style={styles.btn}>{showCreate ? 'Cancel' : 'Add Lab'}</button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input placeholder="Lab Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={styles.input} />
          <input placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={styles.input} />
          <input type="number" placeholder="Capacity" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} style={styles.input} />
          <button type="submit" style={styles.btn}>Create Lab</button>
        </form>
      )}

      <div style={styles.grid}>
        {labs.map((lab) => (
          <div key={lab._id} style={styles.card}>
            <h3 style={styles.labName}>{lab.name}</h3>
            <p style={styles.labDetail}>Location: {lab.location}</p>
            <p style={styles.labDetail}>Capacity: {lab.capacity}</p>
            <p style={styles.labDetail}>Machines: {lab.machineCount} ({lab.onlineCount} online)</p>
            <button onClick={() => handleDelete(lab._id)} style={styles.deleteBtn}>Delete</button>
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  card: { background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  labName: { margin: '0 0 8px 0', color: '#1a1a2e' },
  labDetail: { margin: '0 0 4px 0', color: '#666', fontSize: '14px' },
  deleteBtn: { marginTop: '12px', padding: '6px 14px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
};