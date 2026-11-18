import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatWhen, openPdf } from '../api';
import { downloadReceipt, printReceipt, shareReceipt } from '../receiptDocument';
import { useAuth } from '../App';

function groupsFor(wagons) {
  const grouped = new Map();
  for (const wagon of wagons || []) {
    const setNo = String(wagon.shedNo || '').trim() || '—';
    if (!grouped.has(setNo)) grouped.set(setNo, []);
    grouped.get(setNo).push(wagon);
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([setNo, items]) => ({ setNo, wagons: items }));
}

export default function ReceiptDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [receipt, setReceipt] = useState(null);
  const [partyName, setPartyName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/api/receipts/${id}`)
      .then((data) => {
        setReceipt(data.receipt);
        setPartyName(data.receipt.partyName || '');
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (!receipt) {
    return error ? <div className="banner">{error}</div> : <p>Loading receipt…</p>;
  }

  const saved = receipt.status === 'submitted';
  const canEdit = user.role === 'owner' || user.id === receipt.uploadedBy.id;

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api(`/api/receipts/${receipt.id}/submit`, {
        method: 'POST',
        body: {
          partyName,
          sheds: receipt.wagons.map((wagon) => ({ id: wagon.id, shedNo: wagon.shedNo })),
        },
      });
      setReceipt(data.receipt);
      setPartyName(data.receipt.partyName || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function run(action) {
    setError('');
    Promise.resolve(action(receipt)).catch((err) => setError(err.message));
  }

  return (
    <form className="stack" onSubmit={save}>
      <div className="page-title">
        <div>
          <div className="mark">eT-RR</div>
          <h1>RR {receipt.rrNo}</h1>
          <p>Uploaded {formatWhen(receipt.uploadedAt)} by {receipt.uploadedBy.name}</p>
        </div>
        <div className="tools">
          {saved && (
            <>
              <button className="btn" type="button" onClick={() => run(printReceipt)}>Print</button>
              <button className="btn gold" type="button" onClick={() => run(shareReceipt)}>Share</button>
              <button className="btn ghost" type="button" onClick={() => run(downloadReceipt)}>Download</button>
              <button className="btn ghost" type="button" onClick={() => run(() => openPdf(receipt.id))}>Original PDF</button>
              <Link className="btn ghost" to="/">Go to dashboard</Link>
            </>
          )}
          <Link className="btn ghost" to="/receipts">Back</Link>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <section className="card section">
        <p className="rr-line">{receipt.rrLine}</p>
        <p className="rr-line">{receipt.commodityLine}</p>
        {saved && <p className="rr-line">Party name: {receipt.partyName}</p>}
      </section>
      {saved ? groupsFor(receipt.wagons).map((group) => (
        <section key={group.setNo} className="card table-wrap">
          <h2 className="set-title">Set no: {group.setNo}</h2>
          <p className="set-stock">Total bags: {(receipt.sets || []).find((set) => String(set.setNo) === String(group.setNo))?.totalBags ?? group.wagons.reduce((sum, wagon) => sum + Number(wagon.articleCount || 0), 0)}</p>
          <p className="set-stock">Balance bags: {(receipt.sets || []).find((set) => String(set.setNo) === String(group.setNo))?.balanceBags ?? group.wagons.reduce((sum, wagon) => sum + Number(wagon.articleCount || 0), 0)}</p>
          <table>
            <thead>
              <tr>
                <th>S.no</th>
                <th>Owning Rly</th>
                <th>Type</th>
                <th>Wagon No</th>
                <th>No. of Article</th>
              </tr>
            </thead>
            <tbody>
              {group.wagons.map((wagon) => (
                <tr key={wagon.id}>
                  <td>{wagon.sno}</td>
                  <td>{wagon.owningRly}</td>
                  <td>{wagon.wagonType}</td>
                  <td>{wagon.wagonNo}</td>
                  <td>{wagon.articleCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )) : (
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
      )}
      {!saved && canEdit && (
        <section className="card section">
          <label htmlFor="party">Party name</label>
          <input id="party" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
          <button className="btn" disabled={busy} type="submit" style={{ marginTop: 16 }}>{busy ? 'Saving…' : 'Submit'}</button>
        </section>
      )}
    </form>
  );
}
