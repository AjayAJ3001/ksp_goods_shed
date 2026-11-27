import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

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
                  <td>Trip {truck.trip || 1}</td>
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
