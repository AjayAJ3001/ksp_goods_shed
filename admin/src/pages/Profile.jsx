import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(event) {
    event.preventDefault();
    setError('');
    setSaved('');
    if (newPassword !== confirmPassword) {
      setError('The new password and the confirmation do not match.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved('Password changed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="password-change" onSubmit={save}>
      <h2>Change password</h2>
      {error && <div className="banner">{error}</div>}
      {saved && <div className="ok-banner">{saved}</div>}
      <label htmlFor="current-password">Current password</label>
      <input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
      <label htmlFor="new-password">New password</label>
      <input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
      <label htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
      <button className="btn" disabled={busy} type="submit">{busy ? 'Saving…' : 'Change password'}</button>
    </form>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  return (
    <div className="card profile-card">
      <div className="mark">KSP Goods Shed</div>
      <h1>{user.role === 'owner' ? 'Admin' : user.name}</h1>
      <span className="role">{user.role === 'owner' ? 'Admin' : 'Manager'}</span>
      <PasswordChange />
      <div className="link-list">
        <Link to="/parties">Parties and units</Link>
        <Link to="/rr-master">Upload RR Master</Link>
        {user.role === 'owner' && <Link to="/managers">Managers</Link>}
        {user.role === 'owner' && <Link to="/audit">Audit log</Link>}
        <button type="button" onClick={logout}>Log out</button>
      </div>
    </div>
  );
}
