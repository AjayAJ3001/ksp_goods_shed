import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { downloadReport, printReport, shareReport, viewReport } from '../reportDocument';

const MODES = [
  { id: 'rr', label: 'RR No' },
  { id: 'truck', label: 'Truck' },
  { id: 'set', label: 'Set' },
  { id: 'bags', label: 'Bags' },
  { id: 'date', label: 'Date' },
];

function stamp(value) {
  const [day, month, year] = String(value || '').split('-');
  if (!year || !month || !day) return 0;
  return Number(year) * 10000 + Number(month) * 100 + Number(day);
}

function fieldFor(row, mode) {
  if (mode === 'truck') return row.truckNo;
  if (mode === 'set') return String(row.setNo);
  if (mode === 'bags') return String(row.bags);
  if (mode === 'date') return row.date;
  return row.rrNo;
}

function choices(rows, mode) {
  const values = [...new Set(rows.map((row) => fieldFor(row, mode)).filter(Boolean))];
  if (mode === 'set' || mode === 'bags') return values.sort((a, b) => Number(a) - Number(b));
  if (mode === 'date') return values.sort((a, b) => stamp(a) - stamp(b));
  return values.sort();
}

function groupRows(rows, mode, filter) {
  const filtered = rows.filter((row) => {
    if (mode === 'date') {
      const day = stamp(row.date);
      if (filter.from && day < stamp(filter.from)) return false;
      if (filter.to && day > stamp(filter.to)) return false;
      return true;
    }
    return !filter.value || fieldFor(row, mode) === String(filter.value);
  });
  const grouped = new Map();
  for (const row of filtered) {
    const key = mode === 'truck' ? row.truckNo : mode === 'set' ? `Set ${row.setNo}` : mode === 'bags' ? `${row.bags} bags` : mode === 'date' ? row.date : `RR ${row.rrNo}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const groups = [...grouped.entries()].map(([title, items]) => ({
    title,
    items,
    trucks: items.length,
    bags: items.reduce((sum, item) => sum + Number(item.bags || 0), 0),
  }));
  return {
    label: MODES.find((item) => item.id === mode)?.label || 'RR No',
    groups,
    trucksGone: groups.reduce((sum, group) => sum + group.trucks, 0),
    totalBags: groups.reduce((sum, group) => sum + group.bags, 0),
  };
}

export default function Reports() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('rr');
  const [value, setValue] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    api('/api/reports').then((data) => setRows(data.rows || [])).catch((err) => setError(err.message));
  }, []);

  const options = useMemo(() => choices(rows, mode), [rows, mode]);
  const report = useMemo(() => groupRows(rows, mode, { value, from, to }), [rows, mode, value, from, to]);
  const placeholder = { rr: 'All RR no', truck: 'All trucks', set: 'All sets', bags: 'All bags' }[mode];

  function changeMode(next) {
    setMode(next);
    setValue('');
    setFrom('');
    setTo('');
  }

  function oneReport(item) {
    const title = `${item.truckNo} · RR ${item.rrNo}`;
    return { label: title, groups: [{ title, items: [item] }] };
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">Trucks and bags</div>
          <h1>Report</h1>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <div className="report-filters" style={{ paddingLeft: 0 }}>
        {MODES.map((item) => (
          <button key={item.id} className={item.id === mode ? 'btn' : 'btn ghost'} type="button" onClick={() => changeMode(item.id)}>{item.label}</button>
        ))}
        {mode === 'date' ? (
          <>
            <label className="inline-label">From
              <select value={from} onChange={(event) => setFrom(event.target.value)}>
                <option value="">From date</option>
                {options.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="inline-label">To
              <select value={to} onChange={(event) => setTo(event.target.value)}>
                <option value="">To date</option>
                {options.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </>
        ) : (
          <select value={value} onChange={(event) => setValue(event.target.value)}>
            <option value="">{placeholder}</option>
            {options.map((item) => <option key={item} value={item}>{mode === 'set' ? `Set ${item}` : mode === 'bags' ? `${item} bags` : item}</option>)}
          </select>
        )}
      </div>
      {report.groups.map((group) => (
        <section key={group.title} className="card" style={{ marginBottom: 12 }}>
          <div className="section-head">
            <h2>{group.title}</h2>
          </div>
          <div className="report-fields">
            {group.items.map((item) => (
              <article key={`${item.rrNo}-${item.truckNo}-${item.setNo}`} className="report-entry">
                {[
                  ['Serial no', item.sno],
                  ['Truck number', item.truckNo],
                  ['RR No', item.rrNo],
                  ['RR Date', item.rrDate],
                  ['FNR', item.fnr],
                  ['Date', item.date],
                  ['Station From', item.stationFrom],
                  ['Station To', item.stationTo],
                  ['Commodity', item.commodity],
                  ['Party name', item.partyName],
                  ['Delivery to', item.deliveryTo],
                  ['Bags', item.bags],
                  ['Set no', item.setNo],
                  ['Total bags', item.totalBags],
                  ['Balance bags', item.balanceBags],
                ].map(([label, value]) => (
                  <div key={label}><span>{label}</span><strong>{value || '—'}</strong></div>
                ))}
                <div className="tools">
                  <button className="btn" type="button" onClick={() => viewReport(oneReport(item))}>View</button>
                  <button className="btn" type="button" onClick={() => printReport(oneReport(item))}>Print</button>
                  <button className="btn gold" type="button" onClick={() => shareReport(oneReport(item))}>Share</button>
                  <button className="btn ghost" type="button" onClick={() => downloadReport(oneReport(item))}>Download</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {!report.groups.length && !error && <p className="hint">No trucks have taken bags yet.</p>}
    </div>
  );
}
