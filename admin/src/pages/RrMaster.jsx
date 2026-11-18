import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, downloadStoredPdf, formatWhen, openStoredPdf } from '../api';

export default function RrMaster() {
  const [file, setFile] = useState(null);
  const [masters, setMasters] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    return api('/api/rr-masters')
      .then((data) => setMasters(data.masters))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function storeOriginal(event) {
    event.preventDefault();
    if (!file) return setError('Choose the original PDF.');
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      await api('/api/rr-masters', { method: 'POST', body });
      setFile(null);
      event.target.reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openOriginal(item, download) {
    setError('');
    try {
      const path = `/api/rr-masters/${item.id}/file`;
      if (download) await downloadStoredPdf(path, item.fileName);
      else await openStoredPdf(path);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">RR Master</div>
          <h1>Upload RR Master</h1>
          <p>The original PDF is stored here exactly as you upload it.</p>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <form className="card drop" onSubmit={storeOriginal}>
        <div>
          <label htmlFor="rr-master">Upload RR Master</label>
          <p className="hint">Choose the original railway receipt PDF. A file that is already stored is not saved again.</p>
          <input id="rr-master" type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <button className="btn" disabled={busy} type="submit">{busy ? 'Storing…' : 'Store original PDF'}</button>
      </form>
      <section className="card table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Original PDF</th>
              <th>RR No</th>
              <th>Uploaded</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {masters.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.fileName}</strong>
                  <div className="meta">{item.uploadedBy}</div>
                </td>
                <td>{item.rrNo || '—'}</td>
                <td>{formatWhen(item.uploadedAt)}</td>
                <td className="tools">
                  <button className="btn" type="button" onClick={() => openOriginal(item, false)}>Open</button>
                  <button className="btn ghost" type="button" onClick={() => openOriginal(item, true)}>Download</button>
                  {item.receiptId ? <Link to={`/receipts/${item.receiptId}`}>Receipt</Link> : null}
                </td>
              </tr>
            ))}
            {!masters.length && <tr><td colSpan="4">No original PDFs stored yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
