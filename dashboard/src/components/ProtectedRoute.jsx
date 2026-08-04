import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Access Denied</div>;
  }
  return children;
}