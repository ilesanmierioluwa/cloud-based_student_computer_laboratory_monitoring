import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h2 style={styles.logo}>Lab Monitor</h2>
        <div style={styles.links}>
          <Link to="/" style={styles.link}>Dashboard</Link>
          <Link to="/labs" style={styles.link}>Labs</Link>
          <Link to="/machines" style={styles.link}>Machines</Link>
          <Link to="/attendance" style={styles.link}>Attendance</Link>
          <Link to="/students" style={styles.link}>Students</Link>
          <Link to="/policies" style={styles.link}>Policies</Link>
          {(user?.role === 'admin' || user?.role === 'technician') && <Link to="/violations" style={styles.link}>Violations</Link>}
          <Link to="/reports" style={styles.link}>Reports</Link>
          {user?.role === 'admin' && <Link to="/users" style={styles.link}>Users</Link>}
        </div>
        <div style={styles.user}>
          <span style={styles.userName}>{user?.fullName} ({user?.role})</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#f0f2f5' },
  nav: { background: '#1a1a2e', color: '#fff', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' },
  logo: { margin: '0', fontSize: '18px', fontWeight: '700' },
  links: { display: 'flex', gap: '16px', flex: '1', flexWrap: 'wrap' },
  link: { color: '#ccc', textDecoration: 'none', fontSize: '14px', padding: '4px 0' },
  user: { display: 'flex', alignItems: 'center', gap: '12px' },
  userName: { fontSize: '13px', color: '#aaa' },
  logoutBtn: { padding: '6px 14px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' },
  main: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
};