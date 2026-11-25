import { useEffect, useState } from 'react';
import { api } from '../api';

function when(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '—', time: '—' };
  const options = { timeZone: 'Asia/Kolkata' };
  return {
    date: date.toLocaleDateString('en-IN', { ...options, day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-IN', { ...options, hour: '2-digit', minute: '2-digit' }),
  };
}

function roleName(role) {
  if (role === 'owner') return 'Admin';
  if (role === 'manager') return 'Manager';
  return 'Unknown';
}

function kind(action) {
  return /signed|sign-in|viewed|opened/i.test(action) ? 'Accessed' : 'Used';
}

function LogTable({ rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Who</th>
            <th>Access or use</th>
            <th>What they did</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const stamp = when(item.at);
            return (
              <tr key={item.id}>
                <td>{stamp.date}</td>
                <td>{stamp.time}</td>
                <td><strong>{item.name}</strong><div className="meta">{roleName(item.role)}</div></td>
                <td>{kind(item.action)}</td>
                <td>{item.action}{item.detail ? ` — ${item.detail}` : ''}</td>
              </tr>
            );
          })}
          {!rows.length ? <tr><td colSpan="5">No activity yet.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [source, setSource] = useState('mobile');

  useEffect(() => {
    api('/api/audit-logs')
      .then((data) => setLogs(data.logs || []))
      .catch((err) => setError(err.message));
  }, []);

  const admin = logs.filter((item) => item.source === 'admin');
  const mobile = logs.filter((item) => item.source !== 'admin');

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">Admin only</div>
          <h1>Audit log</h1>
          <p>Who signed in, and what the admin or a manager did, with the date and time.</p>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <div className="report-filters">
        <button className={source === 'mobile' ? 'btn' : 'btn ghost'} type="button" onClick={() => setSource('mobile')}>Mobile app</button>
        <button className={source === 'admin' ? 'btn' : 'btn ghost'} type="button" onClick={() => setSource('admin')}>Admin panel</button>
      </div>
      <section className="card">
        <div className="section-head"><h2>{source === 'mobile' ? 'Mobile app' : 'Admin panel'}</h2></div>
        <LogTable rows={source === 'mobile' ? mobile : admin} />
      </section>
    </div>
  );
}
