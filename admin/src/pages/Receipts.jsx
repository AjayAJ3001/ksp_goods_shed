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

export default function Receipts() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const handle = setTimeout(() => {
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      api(`/api/receipts${query}`)
        .then((data) => setReceipts(data.receipts))
        .catch((err) => setError(err.message));
    }, 200);
    return () => clearTimeout(handle);
  }, [q, reload]);

  async function startReceipt(id) {
    setError('');
    try {
      await api(`/api/receipts/${id}/start`, { method: 'POST' });
      setReload((value) => value + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openReceipt(id) {
    setError('');
    try {
      await api(`/api/receipts/${id}/open`, { method: 'POST' });
      setReload((value) => value + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">Register</div>
          <h1>RR register</h1>
          <p>Open RR and closed RR, with the date each one was uploaded.</p>
        </div>
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search RR, party, commodity" />
      </div>
      {error && <div className="banner">{error}</div>}
      <section className="card table-wrap">
        <table className="register-table">
          <thead>
            <tr>
              <th>RR No</th>
              <th>Commodity</th>
              <th>Party</th>
              <th>Wagons</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td className="rr-cell">
                  <strong>{receipt.rrNo}</strong>
                  <div className="meta">{receipt.rrDate} · {receipt.stationFrom} → {receipt.stationTo}</div>
                </td>
                <td className="commodity-cell">{receipt.commodityDescription}</td>
                <td>{receipt.partyName || '—'}</td>
                <td className="num-cell">{receipt.wagonCount}</td>
                <td>
                  <span className={`status ${receipt.closed ? 'closed' : receipt.started ? 'submitted' : receipt.status === 'submitted' ? 'waiting' : ''}`}>{stateOf(receipt)}</span>
                </td>
                <td className="when-cell">{formatWhen(receipt.uploadedAt)}<div className="meta">{receipt.uploadedBy.name}</div></td>
                <td className="action-cell">
                  <div className="row-actions">
                  <Link className="btn ghost" to={`/receipts/${receipt.id}`}>{receipt.status === 'draft' ? 'Finish' : 'Open RR'}</Link>
                  {user.role === 'owner' && receipt.status === 'submitted' && !receipt.closed && !receipt.started ? (
                    <button className="btn" type="button" onClick={() => startReceipt(receipt.id)}>Start RR</button>
                  ) : null}
                  {receipt.started && !receipt.closed ? (
                    <Link className="btn danger" to={`/receipts/${receipt.id}/close`}>RR closed</Link>
                  ) : null}
                  {user.role === 'owner' && receipt.closed ? (
                    <button className="btn ghost" type="button" onClick={() => openReceipt(receipt.id)}>Reopen RR</button>
                  ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!receipts.length && <tr><td colSpan="7">No RR in the register.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
