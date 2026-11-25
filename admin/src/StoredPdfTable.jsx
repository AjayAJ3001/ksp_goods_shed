import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { dayKey, downloadPdfs, loadPdfs, releasePdfs, sharePdfs } from './storedPdfs';

function when(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '—', time: '—' };
  const options = { timeZone: 'Asia/Kolkata' };
  return {
    date: date.toLocaleDateString('en-IN', { ...options, day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-IN', { ...options, hour: '2-digit', minute: '2-digit' }),
  };
}

export default function StoredPdfTable({ items, filePath, empty }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [rrNo, setRrNo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState([]);

  const names = useMemo(() => [...new Set(items.map((item) => item.uploadedBy).filter(Boolean))].sort(), [items]);
  const rrNos = useMemo(() => [...new Set(items.map((item) => item.rrNo).filter(Boolean))].sort(), [items]);
  const shown = useMemo(() => items.filter((item) => {
    const day = dayKey(item.uploadedAt);
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (name && item.uploadedBy !== name) return false;
    if (rrNo && item.rrNo !== rrNo) return false;
    return true;
  }), [items, from, to, name, rrNo]);

  function closePreview() {
    releasePdfs(preview);
    setPreview([]);
  }

  async function run(rows, action) {
    if (!rows.length || busy) return;
    setBusy(true);
    setError('');
    let files = [];
    try {
      files = await loadPdfs(rows, filePath);
      if (action === 'view') setPreview(files);
      if (action === 'share') {
        await sharePdfs(files);
        releasePdfs(files);
      }
      if (action === 'download') {
        await downloadPdfs(files);
        releasePdfs(files);
      }
    } catch (err) {
      releasePdfs(files);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <div className="banner">{error}</div>}
      <div className="report-filters">
        <label className="inline-label">From
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="inline-label">To
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label className="inline-label">Name
          <select value={name} onChange={(event) => setName(event.target.value)}>
            <option value="">All names</option>
            {names.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="inline-label">RR No
          <select value={rrNo} onChange={(event) => setRrNo(event.target.value)}>
            <option value="">All RR no</option>
            {rrNos.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <section className="card">
        <div className="section-head">
          <h2>{shown.length === items.length ? `All PDFs (${shown.length})` : `Shown PDFs (${shown.length})`}</h2>
          <div className="tools">
            <button className="btn" type="button" disabled={!shown.length || busy} onClick={() => run(shown, 'view')}>View</button>
            <button className="btn gold" type="button" disabled={!shown.length || busy} onClick={() => run(shown, 'share')}>Share</button>
            <button className="btn ghost" type="button" disabled={!shown.length || busy} onClick={() => run(shown, 'download')}>Download</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PDF</th>
                <th>RR No</th>
                <th>Name</th>
                <th>Date</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => {
                const stamp = when(item.uploadedAt);
                return (
                  <tr key={item.id}>
                    <td><strong>{item.fileName}</strong></td>
                    <td>{item.rrNo || '—'}</td>
                    <td>{item.uploadedBy}</td>
                    <td>{stamp.date}</td>
                    <td>{stamp.time}</td>
                    <td className="tools">
                      <button className="btn" type="button" disabled={busy} onClick={() => run([item], 'view')}>View</button>
                      <button className="btn gold" type="button" disabled={busy} onClick={() => run([item], 'share')}>Share</button>
                      <button className="btn ghost" type="button" disabled={busy} onClick={() => run([item], 'download')}>Download</button>
                      {item.receiptId ? <Link to={`/receipts/${item.receiptId}`}>Open RR</Link> : null}
                    </td>
                  </tr>
                );
              })}
              {!shown.length ? <tr><td colSpan="6">{items.length ? 'No PDFs match these filters.' : empty}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
      {preview.length ? (
        <div className="preview-back" role="dialog" aria-label="Uploaded PDFs">
          <div className="preview-card pdf-stack">
            <div className="preview-bar">
              <strong>{preview.length === 1 ? preview[0].label : `${preview.length} PDFs`}</strong>
              <button className="btn ghost" type="button" onClick={closePreview}>Close</button>
            </div>
            <div className="pdf-stack-body">
              {preview.map((file) => (
                <div key={file.url}>
                  {preview.length > 1 ? <div className="pdf-caption">{file.label}</div> : null}
                  <iframe className="pdf-frame" title={file.label} src={file.url} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
