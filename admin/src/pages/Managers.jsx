import { useEffect, useState } from 'react';
import { api, formatWhen } from '../api';

const empty = { name: '', username: '', password: '' };

export default function Managers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api('/api/users').then((data) => setUsers(data.users)).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function createUser(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/users', { method: 'POST', body: form });
      setForm(empty);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setError('');
    try {
      await api(`/api/users/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <div className="mark">Owner</div>
          <h1>Managers</h1>
          <p>Managers can log in on the admin panel and the mobile app, and upload an eT-RR.</p>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <form className="card section manager-form" onSubmit={createUser}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn" disabled={busy} type="submit">{busy ? 'Adding…' : 'Add manager'}</button>
      </form>
      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Receipts</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((person) => (
              <tr key={person.id}>
                <td>{person.name}</td>
                <td>{person.username}</td>
                <td>{person.role === 'owner' ? 'Owner' : 'Manager'}</td>
                <td>{person.receipt_count}</td>
                <td>{formatWhen(person.created_at)}</td>
                <td>
                  {person.role === 'manager' && (
                    <button className="btn danger" type="button" onClick={() => remove(person.id)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
