import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Loads() {
  const [trucks, setTrucks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/loads').then((data) => setTrucks(data.trucks || [])).catch((err) => setError(err.message));
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
              <tr><th>S.no</th><th>Truck number</th><th>RR No</th><th>Bags</th><th>Set no</th><th>Delivery to</th></tr>
            </thead>
            <tbody>
              {trucks.map((truck) => (
                <tr key={truck.id}>
                  <td>{truck.sno}</td>
                  <td><strong>{truck.truckNo}</strong></td>
                  <td>{truck.rrNo}</td>
                  <td>{truck.load ? truck.load.bags : '—'}</td>
                  <td>{truck.load ? truck.load.setNo : '—'}</td>
                  <td>{truck.deliveryTo || '—'}</td>
                </tr>
              ))}
              {!trucks.length && !error && <tr><td colSpan="6">No open truck entry. Upload an RR and save trucks first.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
