import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [partyName, setPartyName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function uploadPdf(event) {
    event.preventDefault();
    if (!file) return setError('Choose the eT-RR PDF.');
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const data = await api('/api/receipts/upload', { method: 'POST', body });
      setReceipt(data.receipt);
      setPartyName(data.receipt.partyName || '');
    } catch (err) {
      setReceipt(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/receipts/submit', {
        method: 'POST',
        body: {
          pendingId: receipt.pendingId,
          partyName,
          sheds: receipt.wagons.map((wagon) => ({ sno: wagon.sno, shedNo: wagon.shedNo })),
        },
      });
      navigate(`/receipts/${data.receipt.id}`);
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
          <div className="mark">RR Upload</div>
          <h1>Read an eT-RR</h1>
          <p>The PDF is stored with today’s date. The same file, or the same RR number, cannot be uploaded again.</p>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      {!receipt && (
        <form className="card drop" onSubmit={uploadPdf}>
          <div>
            <strong>Electronically Transmitted Railway Receipt</strong>
            <p className="hint">Use the PDF that contains the eT-RR block and the wagon list.</p>
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <button className="btn" disabled={busy} type="submit">{busy ? 'Reading PDF…' : 'Upload PDF'}</button>
        </form>
      )}
      {receipt && (
        <form className="stack" onSubmit={submit}>
          <section className="card section">
            <p className="rr-line">{receipt.rrLine}</p>
            <p className="rr-line">{receipt.commodityLine}</p>
            <p className="meta">
              Stored as {receipt.fileName} · {receipt.wagonCount} wagons
              {receipt.consignorCode ? ` · Consignor ${receipt.consignorCode}` : ''}
              {receipt.consigneeCode ? ` · Consignee ${receipt.consigneeCode}` : ''}
            </p>
          </section>
          <section className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>S.no</th>
                  <th>Owning Rly</th>
                  <th>Type</th>
                  <th>Wagon No</th>
                  <th>No. of Article</th>
                  <th>Set no</th>
                </tr>
              </thead>
              <tbody>
                {receipt.wagons.map((wagon) => (
                  <tr key={wagon.id}>
                    <td>{wagon.sno}</td>
                    <td>{wagon.owningRly}</td>
                    <td>{wagon.wagonType}</td>
                    <td>{wagon.wagonNo}</td>
                    <td>{wagon.articleCount}</td>
                    <td>
                      <input
                        aria-label={`Set no for wagon ${wagon.wagonNo}`}
                        value={wagon.shedNo}
                        onChange={(e) => setReceipt((current) => ({
                          ...current,
                          wagons: current.wagons.map((item) => item.id === wagon.id ? { ...item, shedNo: e.target.value } : item),
                        }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card section">
            <label htmlFor="party">Party name</label>
            <input id="party" value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Type the party name" />
          </section>
          <div className="tools">
            <button className="btn" disabled={busy} type="submit">{busy ? 'Saving…' : 'Submit'}</button>
            <Link className="btn ghost" to="/receipts">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}
