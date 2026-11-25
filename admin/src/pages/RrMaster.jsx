import { useEffect, useState } from 'react';
import { api } from '../api';
import StoredPdfTable from '../StoredPdfTable';

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
      <StoredPdfTable
          items={masters}
          filePath={(item) => `/api/rr-masters/${item.id}/file`}
          empty="No original PDFs stored yet."
        />
    </div>
  );
}
