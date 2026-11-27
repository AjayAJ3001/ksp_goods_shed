import { useEffect, useState } from 'react';
import { api } from '../api';

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
                <td>Trip {truck.trip || 1}</td>
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
