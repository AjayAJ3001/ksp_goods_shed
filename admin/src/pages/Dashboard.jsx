import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatWhen } from '../api';
import { useAuth } from '../App';

function stateOf(receipt) {
  if (receipt.closed) return 'Closed';
  if (receipt.status === 'submitted') return 'Open';
  return 'Needs set no';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/api/dashboard'), api('/api/receipts')])
      .then(([dash, list]) => {
        setData(dash);
        setReceipts(list.receipts || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  const stats = data?.stats;
  const total = stats ? Number(stats.submitted_count || 0) + Number(stats.draft_count || 0) : null;
  const current = receipts.find((item) => item.status === 'submitted' && !item.closed);

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">{user.role === 'owner' ? 'Owner' : 'Manager'}</div>
          <h1>{user.name}</h1>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <div className="stats">
        <article className="card stat"><span>Total RR upload</span><strong>{total ?? '—'}</strong></article>
        <article className="card stat"><span>Today</span><strong>{stats ? stats.today_count : '—'}</strong></article>
        <article className="card stat"><span>Saved</span><strong>{stats ? stats.submitted_count : '—'}</strong></article>
        <article className="card stat"><span>Wagons</span><strong>{stats ? stats.wagon_count : '—'}</strong></article>
      </div>

      <section className="card current-rr">
        <div className="section-head">
          <h2>Current RR</h2>
          {current && <span className="status submitted">Open</span>}
        </div>
        {current ? (
          <Link className="current-body" to={`/receipts/${current.id}`}>
            <strong>{current.rrNo}</strong>
            <span>{current.stationFrom} → {current.stationTo}</span>
            <span>{current.commodityDescription}</span>
            <span>{current.partyName || 'Party not entered'} · {current.rrDate} · {current.wagonCount} wagons</span>
          </Link>
        ) : (
          <p className="hint">No RR is open. Upload an RR to start truck entry.</p>
        )}
      </section>

      <div className="dash-grid">
        <section className="card">
          <div className="section-head">
            <h2>List of RR</h2>
            <Link to="/receipts">All receipts</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>RR No</th><th>Route</th><th>Party</th><th>Status</th></tr>
              </thead>
              <tbody>
                {receipts.slice(0, 8).map((receipt) => (
                  <tr key={receipt.id}>
                    <td><Link to={`/receipts/${receipt.id}`}><strong>{receipt.rrNo}</strong></Link><div className="meta">{formatWhen(receipt.uploadedAt)}</div></td>
                    <td>{receipt.stationFrom} → {receipt.stationTo}</td>
                    <td>{receipt.partyName || '—'}</td>
                    <td><span className={`status ${receipt.closed ? 'closed' : receipt.status === 'submitted' ? 'submitted' : ''}`}>{stateOf(receipt)}</span></td>
                  </tr>
                ))}
                {!receipts.length && !error && <tr><td colSpan="4">No receipts yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="section-head">
            <h2>Report</h2>
            <Link to="/reports">Open</Link>
          </div>
          <p className="hint" style={{ padding: '0 18px 16px' }}>Open the report to view, print, share, or download.</p>
        </section>
      </div>
    </div>
  );
}
