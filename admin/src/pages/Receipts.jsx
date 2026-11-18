import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatWhen } from '../api';

export default function Receipts() {
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
          <h1>Receipts</h1>
          <p>Each PDF is kept with the date it was uploaded.</p>
        </div>
        <input className="search" style={{ maxWidth: 280 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search RR, party, commodity" />
      </div>
      {error && <div className="banner">{error}</div>}
      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>RR No</th>
              <th>Commodity</th>
              <th>Party</th>
              <th>Wagons</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td>
                  <strong>{receipt.rrNo}</strong>
                  <div className="meta">{receipt.rrDate} · {receipt.stationFrom} → {receipt.stationTo}</div>
                </td>
                <td>{receipt.commodityDescription}</td>
                <td>{receipt.partyName || '—'}</td>
                <td>{receipt.wagonCount}</td>
                <td><span className={`status ${receipt.closed ? 'closed' : receipt.status}`}>{receipt.closed ? 'Closed' : receipt.status === 'submitted' ? 'Saved' : 'Needs set no'}</span></td>
                <td>{formatWhen(receipt.uploadedAt)}<div className="meta">{receipt.uploadedBy.name}</div></td>
                <td>
                  <Link to={`/receipts/${receipt.id}`}>{receipt.status === 'draft' ? 'Finish' : 'Open receipt'}</Link>
                  {' · '}
                  {receipt.closed ? (
                    <button className="linkish" type="button" onClick={() => openReceipt(receipt.id)}>Open</button>
                  ) : (
                    <Link to={`/receipts/${receipt.id}/close`}>RR closed</Link>
                  )}
                </td>
              </tr>
            ))}
            {!receipts.length && <tr><td colSpan="7">No receipts match.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
