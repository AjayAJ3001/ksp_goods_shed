import { useEffect, useState } from 'react';
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

export default function Trucks() {
  const [trucks, setTrucks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/trucks')
      .then((data) => setTrucks(data.trucks || []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">Register</div>
          <h1>Truck entry</h1>
          <p>Truck entries saved from the mobile app, with the RR number of each upload.</p>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>S.no</th>
              <th>Truck number</th>
              <th>Trip</th>
              <th>RR No</th>
              <th>Commodity</th>
              <th>Party name</th>
              <th>Delivery to</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((truck) => (
              <tr key={truck.id}>
                <td>{truck.sno}</td>
                <td><strong>{truck.truckNo}</strong></td>
                <td>Trip {calcTrip(truck, trucks)}</td>
                <td><strong>{truck.rrNo}</strong></td>
                <td>{truck.commodity}</td>
                <td>{truck.partyName || '—'}</td>
                <td>{truck.deliveryTo || '—'}</td>
                <td>{truck.date}</td>
              </tr>
            ))}
            {!trucks.length && <tr><td colSpan="8">No truck entry yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
