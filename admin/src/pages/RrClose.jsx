import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function closeDocument(report) {
  const rows = (report.trucks || []).map((truck) => `
    <tr>
      <td>${escapeHtml(truck.sno)}</td>
      <td>${escapeHtml(truck.truckNo)}${truck.trip ? ` (Trip ${escapeHtml(truck.trip)})` : ''}</td>
      <td>${escapeHtml(truck.setNo)}</td>
      <td>${escapeHtml(truck.bags)}</td>
      <td>${escapeHtml(truck.deliveryTo)}</td>
    </tr>`).join('');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>RR closed ${escapeHtml(report.rrNo)}</title>
<style>
  body { font-family: Georgia, serif; color: #1c1915; margin: 32px; }
  h1 { margin: 6px 0 12px; } p { margin: 6px 0; } .total { font-size: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #d9d0c2; padding: 6px 8px; text-align: left; }
  th { background: #1b4334; color: #f6f1e7; }
</style></head>
<body>
  <h1>RR closed ${escapeHtml(report.rrNo)}</h1>
  <p>${escapeHtml(report.rrLine)}</p>
  <p>Commodity: ${escapeHtml(report.commodity)}</p>
  <p>Party name: ${escapeHtml(report.partyName)}</p>
  <p class="total">Total bags taken: ${escapeHtml(report.totalBagsTaken)}</p>
  <p class="total">Trucks taken: ${escapeHtml(report.trucksTaken)}</p>
  <table><thead><tr><th>S.no</th><th>Truck number</th><th>Set no</th><th>Bags</th><th>Delivery to</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5">No trucks taken</td></tr>'}</tbody></table>
</body></html>`;
}

function openDocument(report) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) throw new Error('Allow pop-ups to view this RR closed sheet.');
  popup.document.write(closeDocument(report));
  popup.document.close();
  return popup;
}

export default function RrClose() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [missing, setMissing] = useState(null);
  const [error, setError] = useState('');

  function closeReceipt() {
    setError('');
    return api(`/api/receipts/${id}/close`, { method: 'POST' })
      .then((data) => {
        setMissing(null);
        setReport(data.close);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    let cancel = false;
    api(`/api/receipts/${id}/close`)
      .then((data) => {
        if (cancel) return null;
        if (data.close.closed || !data.close.missingLoads?.length) {
          if (data.close.closed) {
            setReport(data.close);
            return null;
          }
          return api(`/api/receipts/${id}/close`, { method: 'POST' }).then((saved) => {
            if (!cancel) setReport(saved.close);
          });
        }
        setMissing(data.close.missingLoads);
        return null;
      })
      .catch((err) => {
        if (!cancel) setError(err.message);
      });
    return () => { cancel = true; };
  }, [id]);

  function run(action) {
    setError('');
    Promise.resolve(action()).catch((err) => setError(err.message));
  }

  if (!report) {
    return (
      <>
        {error ? <div className="banner">{error}</div> : <p>Loading…</p>}
        {missing ? (
          <div className="alert-mask">
            <div className="alert-card">
              <h2>Load entry is still not entered</h2>
              <p>This RR has a truck with no load entry.</p>
              <ul>
                {missing.map((truck) => <li key={truck.sno}>{truck.truckNo}</li>)}
              </ul>
              <div className="alert-actions">
                <button className="btn ghost" type="button" onClick={() => navigate(-1)}>Exit</button>
                <button className="btn danger" type="button" onClick={closeReceipt}>Close anyway</button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">RR closed</div>
          <h1>RR {report.rrNo}</h1>
          <p><span className="status closed">Closed</span></p>
          <p>{report.commodity}</p>
        </div>
        <div className="tools">
          <button className="btn" type="button" onClick={() => run(() => openDocument(report))}>View</button>
          <button className="btn" type="button" onClick={() => run(() => { const popup = openDocument(report); popup.focus(); popup.print(); })}>Print</button>
          <button className="btn gold" type="button" onClick={() => run(() => navigator.share ? navigator.share({ title: `RR closed ${report.rrNo}`, text: `Total bags taken: ${report.totalBagsTaken}\nTrucks taken: ${report.trucksTaken}` }) : openDocument(report))}>Share</button>
          <button className="btn ghost" type="button" onClick={() => run(() => {
            const blob = new Blob([closeDocument(report)], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `RR-closed-${report.rrNo}.html`;
            link.click();
            URL.revokeObjectURL(url);
          })}>Download</button>
          {user.role === 'owner' ? (
            <button className="btn" type="button" onClick={() => {
              setError('');
              api(`/api/receipts/${id}/open`, { method: 'POST' })
                .then(() => navigate(`/receipts/${id}`))
                .catch((err) => setError(err.message));
            }}>Reopen RR</button>
          ) : null}
          <Link className="btn ghost" to="/receipts">Back</Link>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <section className="card section">
        <p className="rr-line">{report.rrLine}</p>
        <p className="rr-line">Party name: {report.partyName || '—'}</p>
        <p className="rr-line"><strong>Total bags taken: {report.totalBagsTaken}</strong></p>
        <p className="rr-line"><strong>Trucks taken: {report.trucksTaken}</strong></p>
      </section>
      <section className="card table-wrap">
        <table>
          <thead>
            <tr><th>S.no</th><th>Truck number</th><th>Set no</th><th>Bags</th><th>Delivery to</th></tr>
          </thead>
          <tbody>
            {report.trucks.map((truck) => (
              <tr key={`${truck.sno}-${truck.truckNo}`}>
                <td>{truck.sno}</td>
                <td>{truck.truckNo} (Trip {truck.trip || 1})</td>
                <td>{truck.setNo}</td>
                <td>{truck.bags}</td>
                <td>{truck.deliveryTo || '—'}</td>
              </tr>
            ))}
            {!report.trucks.length && <tr><td colSpan="5">No trucks taken.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
