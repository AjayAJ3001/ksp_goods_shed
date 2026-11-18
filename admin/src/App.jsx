import { createContext, useContext, useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { clearSession, getStoredUser } from './api';
import Dashboard from './pages/Dashboard';
import Loads from './pages/Loads';
import Login from './pages/Login';
import Managers from './pages/Managers';
import Parties from './pages/Parties';
import Profile from './pages/Profile';
import ReceiptDetail from './pages/ReceiptDetail';
import Receipts from './pages/Receipts';
import Reports from './pages/Reports';
import RrClose from './pages/RrClose';
import RrMaster from './pages/RrMaster';
import Trucks from './pages/Trucks';
import Upload from './pages/Upload';

const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

function Icon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    upload: <><path d="M12 16V6" /><path d="M8 9l4-4 4 4" /><path d="M5 16v3h14v-3" /></>,
    truck: <><path d="M3 15V8h10v7" /><path d="M13 11h4l3 3v1h-7" /><circle cx="7" cy="17" r="1.6" /><circle cx="17" cy="17" r="1.6" /></>,
    load: <><rect x="7" y="3" width="10" height="8" rx="1" /><rect x="3" y="9" width="10" height="8" rx="1" /></>,
    receipts: <><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4" /><path d="M10 12h6M10 16h4" /></>,
    reports: <><path d="M5 19V10M12 19V5M19 19v-7" /></>,
    parties: <><circle cx="8" cy="9" r="2.2" /><circle cx="16" cy="9" r="2.2" /><path d="M4 18c.6-2.2 2.2-3.4 4-3.4s3.4 1.2 4 3.4M12 18c.6-2.2 2.2-3.4 4-3.4s3.4 1.2 4 3.4" /></>,
    master: <><path d="M6 4h12v16H6z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    managers: <><circle cx="12" cy="8" r="3" /><path d="M5 19c1.5-3 3.8-4.5 7-4.5S17.5 16 19 19" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand-lockup">
          <div className="mark">Admin panel</div>
          <h1>KSP Goods Shed</h1>
        </div>
        <nav className="nav">
          <div className="nav-label">Overview</div>
          <NavLink to="/" end><Icon name="dashboard" />Dashboard</NavLink>
          <div className="nav-label">Operations</div>
          <NavLink to="/upload"><Icon name="upload" />RR Upload</NavLink>
          <NavLink to="/receipts"><Icon name="receipts" />All receipts</NavLink>
          <NavLink to="/trucks"><Icon name="truck" />Truck entry</NavLink>
          <NavLink to="/loads"><Icon name="load" />Load entry</NavLink>
          <div className="nav-label">Masters</div>
          <NavLink to="/parties"><Icon name="parties" />Parties and units</NavLink>
          <NavLink to="/rr-master"><Icon name="master" />RR Master</NavLink>
          {user.role === 'owner' && <NavLink to="/managers"><Icon name="managers" />Managers</NavLink>}
        </nav>
        <div className="side-user">
          <strong>{user.name}</strong>
          <span className="role">{user.role === 'owner' ? 'Owner' : 'Manager'}</span>
          <button className="btn ghost block" onClick={logout} type="button">Log out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Shell />;
}

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const navigate = useNavigate();
  const auth = useMemo(() => ({
    user,
    setUser,
    logout() {
      clearSession();
      setUser(null);
      navigate('/login');
    },
  }), [user, navigate]);

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<RequireAuth />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="trucks" element={<Trucks />} />
          <Route path="loads" element={<Loads />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
          <Route path="rr-master" element={<RrMaster />} />
          <Route path="receipts/:id/close" element={<RrClose />} />
          <Route path="receipts/:id" element={<ReceiptDetail />} />
          <Route path="parties" element={<Parties />} />
          <Route path="managers" element={user?.role === 'owner' ? <Managers /> : <Navigate to="/" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
