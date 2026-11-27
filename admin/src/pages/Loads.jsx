import { useCallback, useEffect, useState } from 'react';
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
  const [parties, setParties] = useState([]);
  const [error, setError] = useState('');

  const [editingTruck, setEditingTruck] = useState(null);
  const [editTruckNo, setEditTruckNo] = useState('');
  const [editUnitId, setEditUnitId] = useState(null);
  const [editBags, setEditBags] = useState('');
  const [editSetNo, setEditSetNo] = useState(null);
  const [editWagonId, setEditWagonId] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const loadData = useCallback(() => {
    api('/api/loads')
      .then((data) => {
        setTrucks(data.trucks || []);
        setClosed(data.closed || []);
        setParties(data.parties || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function startEdit(truck) {
    setEditingTruck(truck);
    setEditTruckNo(truck.truckNo || '');
    setEditUnitId(truck.unitId || null);
    setEditBags(truck.load ? String(truck.load.bags) : '');
    setEditSetNo(truck.load ? Number(truck.load.setNo) : null);
    setEditWagonId(truck.load?.wagonId || null);
    setEditError('');
  }

  function closeEdit() {
    setEditingTruck(null);
    setEditError('');
  }

  const editChoices = editingTruck?.sets?.length ? editingTruck.sets : [];
  const editSet = editChoices.find((s) => Number(s.setNo) === Number(editSetNo));
  const editWagons = editSet?.wagons || [];
  const partyForTruck = parties.find((p) => p.id === editingTruck?.partyId || p.name === editingTruck?.partyName);
  let editUnits = editingTruck?.partyUnits?.length ? editingTruck.partyUnits : (partyForTruck?.units || []);
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
    const count = Number(editBags);
    if (!editTruckNo.trim()) {
      setEditError('Enter the truck number.');
      return;
    }
    if (!Number.isInteger(count) || count < 1) {
      setEditError('Enter the number of bags.');
      return;
    }
    if (!editSetNo) {
      setEditError('Choose a set number.');
      return;
    }
    if (!editWagonId) {
      setEditError('Choose a wagon.');
      return;
    }
    const currentWagon = editWagons.find((w) => w.id === editWagonId);
    if (currentWagon) {
      const avail = currentWagon.id === editingTruck.load?.wagonId
        ? currentWagon.balanceBags + Number(editingTruck.load?.bags || 0)
        : currentWagon.balanceBags;
      if (count > avail) {
        setEditError(`Wagon ${currentWagon.wagonNo} has ${avail} bags left.`);
        return;
      }
    }
    setEditBusy(true);
    setEditError('');
    const resolvedUnit = editUnits.find((u) => u.id === editUnitId);
    try {
      await api(`/api/loads/${editingTruck.id}`, {
        method: 'PUT',
        body: {
          truckId: editingTruck.id,
          truckNo: editTruckNo.trim().toUpperCase(),
          unitId: editUnitId,
          deliveryTo: resolvedUnit?.name || editingTruck.deliveryTo,
          bags: count,
          setNo: editSetNo,
          wagonId: editWagonId,
        },
      });
      closeEdit();
      loadData();
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
          <div className="mark">Open RR</div>
          <h1>Load entry</h1>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>S.no</th>
                <th>Truck number</th>
                <th>Trip</th>
                <th>RR No</th>
                <th>Bags</th>
                <th>Set no</th>
                <th>Wagon no</th>
                <th>Delivery to</th>
                <th>Action</th>
              </tr>
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
                  <td>
                    {!truck.closed ? (
                      <button
                        type="button"
                        className="button button-subtle"
                        style={{ padding: '4px 10px', fontSize: '13px' }}
                        onClick={() => startEdit(truck)}
                      >
                        Edit
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {!trucks.length && !error && <tr><td colSpan="9">No open truck entry. Upload an RR and save trucks first.</td></tr>}
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

      {editingTruck && (
        <div className="preview-back" role="dialog" aria-label="Edit Load Entry" onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}>
          <div className="preview-card" style={{ maxWidth: '520px', height: 'auto', padding: '24px', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Edit Load Entry (S.no: {editingTruck.sno})</h2>
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
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: 4 }}>Bags</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  value={editBags}
                  onChange={(e) => setEditBags(e.target.value)}
                  placeholder="Number of bags"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: 4 }}>Set No</label>
                <select
                  className="input"
                  value={editSetNo || ''}
                  onChange={(e) => {
                    setEditSetNo(Number(e.target.value) || null);
                    setEditWagonId(null);
                  }}
                  required
                >
                  <option value="">Choose Set</option>
                  {editChoices.map((s) => (
                    <option key={s.setNo} value={s.setNo}>
                      Set {s.setNo} {s.balanceBags != null ? `(Balance: ${s.balanceBags})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: 4 }}>Wagon No</label>
                <select
                  className="input"
                  value={editWagonId || ''}
                  disabled={!editSetNo}
                  onChange={(e) => setEditWagonId(Number(e.target.value) || null)}
                  required
                >
                  <option value="">Choose Wagon</option>
                  {editWagons.map((w) => {
                    const avail = w.id === editingTruck.load?.wagonId
                      ? w.balanceBags + Number(editingTruck.load?.bags || 0)
                      : w.balanceBags;
                    return (
                      <option key={w.id} value={w.id}>
                        {w.wagonNo} ({avail} bags available)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="button button-subtle" onClick={closeEdit} disabled={editBusy}>
                  Cancel
                </button>
                <button type="submit" className="button button-primary" disabled={editBusy}>
                  {editBusy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
