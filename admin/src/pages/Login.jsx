import { useState } from 'react';
import { api, saveSession } from '../api';
import { useAuth } from '../App';

export default function Login() {
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { username, password } });
      saveSession(data.token, data.user);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <section className="login-photo">
        <div>
          <div className="mark">Admin panel</div>
          <h1>KSP Goods Shed</h1>
          <p>Railway receipts, trucks, and loads for the shed office.</p>
        </div>
      </section>
      <section className="login-panel">
        <form className="card login-card" onSubmit={onSubmit}>
          <h2>Sign in</h2>
          <p className="hint">Use your owner or manager account.</p>
          {error && <div className="banner">{error}</div>}
          <label htmlFor="username">Username</label>
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <button className="btn block" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </div>
  );
}
