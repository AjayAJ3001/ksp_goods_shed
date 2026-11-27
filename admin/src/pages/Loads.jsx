import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function calcTrip(truck, list = []) {
  if (truck.trip && Number(truck.trip) > 1) return truck.trip;
  const target = String(truck.truckNo || '').trim().toUpperCase();
  const same = list.filter((t) => (t.receiptId === truck.receiptId || t.rrNo === truck.rrNo) && String(t.truckNo || '').trim().toUpperCase() === target);
  if (same.length > 1) {
    same.sort((a, b) => (Number(a.sno) || 0) - (Number(b.sno) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0));
    const idx = same.findIndex((t) => (t.id && truck.id && t.id === truck.id) || (t.sno && truck.sno && t.sno === truck.sno));
    if (idx >= 0) return idx + 1;
  }
  return truck.trip || 1;
}

export default function Loads() {
  const [trucks, setTrucks] = useState([]);
  const [closed, setClosed] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/loads')
      .then((data) => {
        setTrucks(data.trucks || []);
        setClosed(data.closed || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">Open RR</div>
          <h1>Load entry</h1>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>S.no</th><th>Truck number</th><th>Trip</th><th>RR No</th><th>Bags</th><th>Set no</th><th>Wagon no</th><th>Delivery to</th></tr>
            </thead>
            <tbody>
              {trucks.map((truck) => (
                <tr key={truck.id}>
                  <td>{truck.sno}</td>
                  <td><strong>{truck.truckNo}</strong></td>
                  <td>Trip {calcTrip(truck, trucks)}</td>
                  <td>{truck.rrNo}{truck.closed && !truck.load ? ' · closed' : ''}</td>
                  <td>{truck.load ? truck.load.bags : truck.closed ? 'Not entered' : '—'}</td>
                  <td>{truck.load ? truck.load.setNo : truck.closed ? 'Not entered' : '—'}</td>
                  <td>{truck.load?.wagonNo || (truck.closed ? 'Not entered' : '—')}</td>
                  <td>{truck.deliveryTo || '—'}</td>
                </tr>
              ))}
              {!trucks.length && !error && <tr><td colSpan="8">No open truck entry. Upload an RR and save trucks first.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {closed.length ? (
        <section className="closed-rrs">
          <h2>Closed RR</h2>
          {closed.map((item) => (
            <Link key={item.id} className="closed-rr" to={`/loads/closed/${item.id}`}>
              <span>
                <strong>RR No: {item.rrNo}</strong>
                <span>{item.stationFrom || '—'} → {item.stationTo || '—'}</span>
                <span>{item.partyName || 'Party not entered'}</span>
              </span>
              <i className="chevron" aria-hidden="true" />
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
