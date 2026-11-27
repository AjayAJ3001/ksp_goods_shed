import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function closedLoadDocument(report) {
  const rows = (report.trucks || []).map((truck) => `
    <tr>
      <td>${escapeHtml(truck.sno)}</td>
      <td>${escapeHtml(truck.truckNo)}${truck.trip ? ` (Trip ${escapeHtml(truck.trip)})` : ''}</td>
      <td>${escapeHtml(truck.entered ? truck.setNo : 'Not entered')}</td>
      <td>${escapeHtml(truck.entered ? (truck.wagonNo || '—') : 'Not entered')}</td>
      <td>${escapeHtml(truck.entered ? truck.bags : 'Not entered')}</td>
      <td>${escapeHtml(truck.deliveryTo || '—')}</td>
    </tr>`).join('');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>RR ${escapeHtml(report.rrNo)} load</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #122033; margin: 32px; }
  h1 { color: #0B1B33; margin: 0 0 8px; }
  .rule { height: 4px; background: #0B1B33; border-bottom: 4px solid #E0A020; margin: 10px 0 16px; }
  p { margin: 6px 0; }
  .total { font-size: 18px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #d5e1ec; padding: 6px 8px; text-align: left; }
  th { background: #0B1B33; color: #fff; }
</style></head>
<body>
  <h1>Closed RR load ${escapeHtml(report.rrNo)}</h1>
  <div class="rule"></div>
  <p>RR Date: ${escapeHtml(report.rrDate || '—')} · FNR: ${escapeHtml(report.fnr || '—')}</p>
  <p>${escapeHtml(report.stationFrom)} → ${escapeHtml(report.stationTo)}</p>
  <p>Commodity: ${escapeHtml(report.commodity || '—')}</p>
  <p>Party name: ${escapeHtml(report.partyName || '—')}</p>
  <p class="total">Trucks gone: ${escapeHtml(report.trucksGone)}</p>
  <p class="total">Total bags: ${escapeHtml(report.totalBags)}</p>
  <p class="total">Bags taken: ${escapeHtml(report.bagsTaken)}</p>
  <p class="total">Balance bags: ${escapeHtml(report.balanceBags)}</p>
  <table><thead><tr><th>S.no</th><th>Truck number</th><th>Set no</th><th>Wagon no</th><th>Bags</th><th>Delivery to</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="6">No trucks on this RR</td></tr>'}</tbody></table>
</body></html>`;
}

function openDocument(report) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) throw new Error('Allow pop-ups to view this RR load.');
  popup.document.write(closedLoadDocument(report));
  popup.document.close();
  return popup;
}

export default function ClosedLoad() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/loads/closed/${id}`).then((data) => setReport(data.report)).catch((err) => setError(err.message));
  }, [id]);

  function run(action) {
    setError('');
    Promise.resolve(action()).catch((err) => setError(err.message));
  }

  if (!report) return error ? <div className="banner">{error}</div> : <p>Loading…</p>;

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">Closed RR</div>
          <h1>RR {report.rrNo}</h1>
          <p>{report.stationFrom} → {report.stationTo}</p>
        </div>
        <div className="tools">
          <button className="btn" type="button" onClick={() => run(() => openDocument(report))}>View</button>
          <button className="btn" type="button" onClick={() => run(() => { const popup = openDocument(report); popup.focus(); popup.print(); })}>Print</button>
          <button className="btn gold" type="button" onClick={() => run(() => navigator.share ? navigator.share({ title: `RR ${report.rrNo} load`, text: `Trucks gone: ${report.trucksGone}\nTotal bags: ${report.totalBags}\nBags taken: ${report.bagsTaken}\nBalance bags: ${report.balanceBags}` }) : openDocument(report))}>Share</button>
          <button className="btn ghost" type="button" onClick={() => run(() => {
            const blob = new Blob([closedLoadDocument(report)], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `RR-load-${report.rrNo}.html`;
            link.click();
            URL.revokeObjectURL(url);
          })}>Download</button>
          <Link className="btn ghost" to="/loads">Back</Link>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <section className="card section">
        <p className="rr-line">RR Date: {report.rrDate || '—'} · FNR: {report.fnr || '—'}</p>
        <p className="rr-line">Commodity: {report.commodity || '—'}</p>
        <p className="rr-line">Party name: {report.partyName || '—'}</p>
        <p className="rr-line"><strong>Trucks gone: {report.trucksGone}</strong></p>
        <p className="rr-line"><strong>Total bags: {report.totalBags}</strong></p>
        <p className="rr-line"><strong>Bags taken: {report.bagsTaken}</strong></p>
        <p className="rr-line"><strong>Balance bags: {report.balanceBags}</strong></p>
      </section>
      {(report.sets || []).map((set) => (
        <section className="card section" key={set.setNo}>
          <h2>Set no: {set.setNo}</h2>
          <p className="rr-line">Total bags: {set.totalBags}</p>
          <p className="rr-line">Balance bags: {set.balanceBags}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Wagon no</th><th>Articles</th><th>Balance bags</th></tr>
              </thead>
              <tbody>
                {(set.wagons || []).map((wagon) => (
                  <tr key={wagon.id}>
                    <td>{wagon.wagonNo}</td>
                    <td>{wagon.articleCount}</td>
                    <td>{wagon.balanceBags}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>S.no</th><th>Truck number</th><th>Set no</th><th>Wagon no</th><th>Bags</th><th>Delivery to</th></tr>
            </thead>
            <tbody>
              {(report.trucks || []).map((truck) => (
                <tr key={`${truck.sno}-${truck.truckNo}`}>
                  <td>{truck.sno}</td>
                  <td><strong>{truck.truckNo}</strong> (Trip {truck.trip || 1})</td>
                  <td>{truck.entered ? truck.setNo : 'Not entered'}</td>
                  <td>{truck.entered ? (truck.wagonNo || '—') : 'Not entered'}</td>
                  <td>{truck.entered ? truck.bags : 'Not entered'}</td>
                  <td>{truck.deliveryTo || '—'}</td>
                </tr>
              ))}
              {!report.trucks.length && <tr><td colSpan="6">No trucks on this RR.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
