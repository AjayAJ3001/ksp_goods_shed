import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatWhen } from '../api';
import { useAuth } from '../App';

function stateOf(receipt) {
  if (receipt.closed) return 'Closed RR';
  if (receipt.status === 'submitted' && receipt.started) return 'Active RR';
  if (receipt.status === 'submitted') return 'Waiting';
  return 'Needs set no';
}

export default function Dashboard() {
  const { user } = useAuth();
  const workingKey = `gs_working_rr:${user?.id || 'none'}`;
  const manager = user?.role !== 'owner';
  const [data, setData] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState(() => Number(sessionStorage.getItem(workingKey)) || null);
  const [prompt, setPrompt] = useState(null);
  const [open, setOpen] = useState('active');

  useEffect(() => {
    Promise.all([api('/api/dashboard'), api('/api/receipts')])
      .then(([dash, list]) => {
        const rows = list.receipts || [];
        setData(dash);
        setReceipts(rows);
        setWorkingId((id) => {
          if (rows.some((item) => item.active && item.id === id)) return id;
          sessionStorage.removeItem(workingKey);
          return null;
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  const stats = data?.stats;
  const total = stats ? Number(stats.submitted_count || 0) + Number(stats.draft_count || 0) : null;
  const active = receipts.filter((item) => item.active);
  const waiting = receipts.filter((item) => item.status === 'submitted' && !item.started && !item.closed);
  const current = active.find((item) => item.id === workingId) || null;

  function choose(id) {
    sessionStorage.setItem(workingKey, String(id));
    setWorkingId(id);
  }

  function requestEntry(item) {
    if (!manager && active.length < 2) {
      choose(item.id);
      return;
    }
    setPrompt({ mode: current?.id === item.id ? 'close' : 'start', id: item.id, rrNo: item.rrNo });
  }

  function confirmEntry() {
    if (!prompt) return;
    if (prompt.mode === 'close') {
      sessionStorage.removeItem(workingKey);
      setWorkingId(null);
    } else {
      choose(prompt.id);
    }
    setPrompt(null);
  }

  function reopenReceipt(id) {
    setError('');
    api(`/api/receipts/${id}/open`, { method: 'POST' })
      .then(() => api('/api/receipts'))
      .then((list) => setReceipts(list.receipts || []))
      .catch((err) => setError(err.message));
  }

  function toggle(key) {
    setOpen((current) => (current === key ? '' : key));
  }

  function startReceipt(id) {
    setError('');
    api(`/api/receipts/${id}/start`, { method: 'POST' })
      .then(() => api('/api/receipts'))
      .then((list) => {
        setReceipts(list.receipts || []);
        if (!(list.receipts || []).some((item) => item.active && item.id !== id)) choose(id);
      })
      .catch((err) => setError(err.message));
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">{user.role === 'owner' ? 'Admin' : 'Manager'}</div>
          <h1>{user.role === 'owner' ? 'Admin' : user.name}</h1>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      {prompt ? (
        <div className="alert-mask">
          <div className="alert-card">
            <h2>{prompt.mode === 'close' ? 'Close the entry' : 'Start the entry'}</h2>
            <p>{prompt.mode === 'close' ? `Close the entry for RR ${prompt.rrNo}?` : `Start the entry for RR ${prompt.rrNo}?`}</p>
            <div className="alert-actions">
              <button className="btn ghost" type="button" onClick={() => setPrompt(null)}>Exit</button>
              <button className={prompt.mode === 'close' ? 'btn danger' : 'btn'} type="button" onClick={confirmEntry}>
                {prompt.mode === 'close' ? 'Close the entry' : 'Start the entry'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="stats">
        <article className="card stat"><span>Total RR upload</span><strong>{total ?? '—'}</strong></article>
        <article className="card stat"><span>Today</span><strong>{stats ? stats.today_count : '—'}</strong></article>
        <article className="card stat"><span>Saved</span><strong>{stats ? stats.submitted_count : '—'}</strong></article>
        <article className="card stat"><span>Wagons</span><strong>{stats ? stats.wagon_count : '—'}</strong></article>
      </div>

      <div className="dash-stack">
        <section className={`card dash-panel ${open === 'active' ? 'open' : ''}`}>
          <button className="dash-toggle" type="button" aria-expanded={open === 'active'} onClick={() => toggle('active')}>
            <h2>Active RR</h2>
            <span className="dash-chevron" />
          </button>
          {open === 'active' ? (
            <div className="dash-body">
              {current && user.role === 'owner' ? (
                <div className="dash-actions"><Link className="btn danger" to={`/receipts/${current.id}/close`}>RR closed</Link></div>
              ) : null}
              {active.length ? (
                <div className="active-picks">
                  {active.map((item) => (
                    <button key={item.id} className={`active-pick ${current?.id === item.id ? 'on' : ''}`} type="button" onClick={() => requestEntry(item)}>
                      <strong>{item.rrNo}</strong>
                      <div className="meta">{item.stationFrom} → {item.stationTo}</div>
                      <div className={current?.id === item.id ? 'entry-mark started' : 'entry-mark ready'}>{current?.id === item.id ? 'Entry started' : 'Start the entry'}</div>
                    </button>
                  ))}
                  {current ? null : <p className="hint">Choose the RR you want to start.</p>}
                </div>
              ) : null}
              {current ? (
                <Link className="current-body" to={`/receipts/${current.id}`}>
                  <strong>{current.rrNo}</strong>
                  <span>{current.stationFrom} → {current.stationTo}</span>
                  <span>{current.commodityDescription}</span>
                  <span>{current.partyName || 'Party not entered'} · {current.rrDate} · {current.wagonCount} wagons</span>
                </Link>
              ) : active.length ? null : (
                <p className="hint">No active RR. An admin starts an uploaded RR before truck and load entry.</p>
              )}
              {user.role === 'owner' && waiting.length ? (
                <div className="active-picks">
                  {waiting.map((item) => (
                    <div key={item.id} className="active-pick">
                      <strong>{item.rrNo}</strong>
                      <div className="meta">Waiting for the admin to start</div>
                      <button className="btn" type="button" style={{ marginTop: 8 }} onClick={() => startReceipt(item.id)}>Start RR</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className={`card dash-panel ${open === 'list' ? 'open' : ''}`}>
          <button className="dash-toggle" type="button" aria-expanded={open === 'list'} onClick={() => toggle('list')}>
            <h2>List of RR</h2>
            <span className="dash-chevron" />
          </button>
          {open === 'list' ? (
            <div className="dash-body">
              <div className="dash-actions"><Link to="/receipts">RR register</Link></div>
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
                        <td>
                          <span className={`status ${receipt.closed ? 'closed' : receipt.started ? 'submitted' : receipt.status === 'submitted' ? 'waiting' : ''}`}>{stateOf(receipt)}</span>
                          {user.role === 'owner' && receipt.closed ? (
                            <button className="btn ghost" type="button" style={{ marginTop: 8 }} onClick={() => reopenReceipt(receipt.id)}>Reopen RR</button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {!receipts.length && !error && <tr><td colSpan="4">No RR yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>

        {user.role === 'owner' ? (
          <section className={`card dash-panel ${open === 'report' ? 'open' : ''}`}>
            <button className="dash-toggle" type="button" aria-expanded={open === 'report'} onClick={() => toggle('report')}>
              <h2>Report</h2>
              <span className="dash-chevron" />
            </button>
            {open === 'report' ? (
              <div className="dash-body">
                <p className="hint">Open the report to view, print, share, or download.</p>
                <div className="dash-actions"><Link to="/reports">Open</Link></div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
