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
  const [parties, setParties] = useState([]);
  const [error, setError] = useState('');

  const [editingTruck, setEditingTruck] = useState(null);
  const [editTruckNo, setEditTruckNo] = useState('');
  const [editUnitId, setEditUnitId] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  function loadTrucks() {
    api('/api/trucks')
      .then((data) => {
        setTrucks(data.trucks || []);
        setParties(data.parties || []);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadTrucks();
  }, []);

  function startEdit(truck) {
    setEditingTruck(truck);
    setEditTruckNo(truck.truckNo || '');
    setEditUnitId(truck.unitId || null);
    setEditError('');
  }

  function closeEdit() {
    setEditingTruck(null);
    setEditError('');
  }

  const partyForTruck = parties.find((p) => p.id === editingTruck?.partyId || p.name === editingTruck?.partyName);
  let editUnits = partyForTruck?.units || [];
  if (!editUnits.length) {
    const seen = new Set();
    const list = [];
    for (const p of parties) {
      for (const u of (p.units || [])) {
        const key = u.name.trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(u);
        }
      }
    }
    editUnits = list;
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editTruckNo.trim()) {
      setEditError('Enter the truck number.');
      return;
    }
    setEditBusy(true);
    setEditError('');
    const resolvedUnit = editUnits.find((u) => u.id === editUnitId);
    const payload = {
      truckId: editingTruck.id,
      truckNo: editTruckNo.trim().toUpperCase(),
      unitId: editUnitId,
      deliveryTo: resolvedUnit?.name || editingTruck.deliveryTo,
    };
    try {
      let data;
      try {
        data = await api(`/api/trucks/${editingTruck.id}`, {
          method: 'PUT',
          body: payload,
        });
      } catch (putErr) {
        if (putErr.status === 404 || (putErr.message && (putErr.message.includes('404') || putErr.message.includes('Cannot PUT')))) {
          data = await api(`/api/trucks/${editingTruck.id}`, {
            method: 'POST',
            body: payload,
          });
        } else {
          throw putErr;
        }
      }
      const updated = data?.truck || {
        ...editingTruck,
        truckNo: payload.truckNo,
        unitId: payload.unitId,
        deliveryTo: payload.deliveryTo,
      };
      setTrucks((prev) => prev.map((t) => (t.id === editingTruck.id ? { ...t, ...updated } : t)));
      closeEdit();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditBusy(false);
    }
  }

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
              <th>Action</th>
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
                <td>
                  <button
                    type="button"
                    className="button button-subtle"
                    onClick={() => startEdit(truck)}
                    style={{ padding: '4px 10px', fontSize: '13px' }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {!trucks.length && <tr><td colSpan="9">No truck entry yet.</td></tr>}
          </tbody>
        </table>
      </section>

      {editingTruck && (
        <div className="preview-back" onClick={closeEdit}>
          <div className="preview-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Edit Truck Details (S.no: {editingTruck.sno})</h2>
              <button type="button" className="button button-subtle" onClick={closeEdit}>✕</button>
            </div>
            {editError && <div className="banner">{editError}</div>}
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: 4 }}>Truck Number</label>
                <input
                  type="text"
                  className="input"
                  value={editTruckNo}
                  onChange={(e) => setEditTruckNo(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: 4 }}>Delivery To</label>
                <select
                  className="input"
                  value={editUnitId || ''}
                  onChange={(e) => setEditUnitId(Number(e.target.value) || null)}
                >
                  <option value="">Choose Delivery Unit</option>
                  {editUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="button button-primary" disabled={editBusy} style={{ flex: 1 }}>
                  {editBusy ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" className="button button-subtle" onClick={closeEdit} disabled={editBusy}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
