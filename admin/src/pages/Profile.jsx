import { Link } from 'react-router-dom';
import { useAuth } from '../App';

export default function Profile() {
  const { user, logout } = useAuth();
  return (
    <div className="card profile-card">
      <div className="mark">KSP Goods Shed</div>
      <h1>{user.name}</h1>
      <span className="role">{user.role === 'owner' ? 'Owner' : 'Manager'}</span>
      <div className="link-list">
        <Link to="/parties">Parties and units</Link>
        <Link to="/rr-master">Upload RR Master</Link>
        {user.role === 'owner' && <Link to="/managers">Managers</Link>}
        <button type="button" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
