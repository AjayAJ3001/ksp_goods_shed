import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyParty = { name: '', contactPerson: '', mobileNumber: '', address: '', status: 'ACTIVE' };
const emptyUnit = { name: '', status: 'ACTIVE' };

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [units, setUnits] = useState([]);
  const [partyForm, setPartyForm] = useState(emptyParty);
  const [editingPartyId, setEditingPartyId] = useState(null);
  const [unitForm, setUnitForm] = useState(emptyUnit);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = parties.find((party) => party.id === selectedId) || null;

  function loadParties(keepId) {
    return api('/api/parties').then((data) => {
      setParties(data.parties);
      setSelectedId(keepId || data.parties[0]?.id || null);
    });
  }

  function loadUnits(partyId) {
    if (!partyId) {
      setUnits([]);
      return Promise.resolve();
    }
    return api(`/api/parties/${partyId}/units`).then((data) => setUnits(data.units));
  }

  useEffect(() => {
    loadParties().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setUnitForm(emptyUnit);
    setEditingUnitId(null);
    loadUnits(selectedId).catch((err) => setError(err.message));
  }, [selectedId]);

  async function saveParty(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const savedId = editingPartyId
        ? (await api(`/api/parties/${editingPartyId}`, { method: 'PUT', body: partyForm }), editingPartyId)
        : (await api('/api/parties', { method: 'POST', body: partyForm })).party.id;
      setPartyForm(emptyParty);
      setEditingPartyId(null);
      await loadParties(savedId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function editParty(party) {
    setEditingPartyId(party.id);
    setSelectedId(party.id);
    setPartyForm({
      name: party.name,
      contactPerson: party.contactPerson,
      mobileNumber: party.mobileNumber,
      address: party.address,
      status: party.status,
    });
  }

  async function saveUnit(event) {
    event.preventDefault();
    if (!selectedId) return setError('Choose a party first.');
    setBusy(true);
    setError('');
    try {
      const body = { name: unitForm.name, status: unitForm.status };
      if (editingUnitId) await api(`/api/party-units/${editingUnitId}`, { method: 'PUT', body });
      else await api(`/api/parties/${selectedId}/units`, { method: 'POST', body });
      setUnitForm(emptyUnit);
      setEditingUnitId(null);
      await Promise.all([loadUnits(selectedId), loadParties(selectedId)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function editUnit(unit) {
    setEditingUnitId(unit.id);
    setUnitForm({ name: unit.name, status: unit.status });
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <div className="mark">From KSP Service</div>
          <h1>Parties and Units</h1>
          <p>The same parties and delivery units used in KSP Service. Choose a party to see its units.</p>
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      <div className="split">
        <section className="stack">
          <form className="card section stack" onSubmit={saveParty}>
            <strong>{editingPartyId ? 'Edit party' : 'Add party'}</strong>
            <div>
              <label htmlFor="party-name">Party name</label>
              <input id="party-name" value={partyForm.name} onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })} />
            </div>
            <div className="pair">
              <div>
                <label htmlFor="party-contact">Contact person</label>
                <input id="party-contact" value={partyForm.contactPerson} onChange={(e) => setPartyForm({ ...partyForm, contactPerson: e.target.value })} />
              </div>
              <div>
                <label htmlFor="party-mobile">Mobile</label>
                <input id="party-mobile" value={partyForm.mobileNumber} onChange={(e) => setPartyForm({ ...partyForm, mobileNumber: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="party-address">Address</label>
              <input id="party-address" value={partyForm.address} onChange={(e) => setPartyForm({ ...partyForm, address: e.target.value })} />
            </div>
            <div className="tools">
              <button className="btn" disabled={busy} type="submit">{busy ? 'Saving…' : editingPartyId ? 'Save party' : 'Add party'}</button>
              {editingPartyId && (
                <button className="btn ghost" type="button" onClick={() => { setEditingPartyId(null); setPartyForm(emptyParty); }}>Cancel</button>
              )}
            </div>
          </form>
          <section className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Units</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party.id} className={party.id === selectedId ? 'selected-row' : ''} onClick={() => setSelectedId(party.id)}>
                    <td>
                      <strong>{party.name}</strong>
                      {party.contactPerson ? <div className="meta">{party.contactPerson}</div> : null}
                    </td>
                    <td>{party.unitCount}</td>
                    <td><button className="btn ghost" type="button" onClick={(event) => { event.stopPropagation(); editParty(party); }}>Edit</button></td>
                  </tr>
                ))}
                {!parties.length && <tr><td colSpan="3">No parties yet.</td></tr>}
              </tbody>
            </table>
          </section>
        </section>
        <section className="stack">
          <form className="card section stack" onSubmit={saveUnit}>
            <strong>{selected ? `${selected.name} units` : 'Units'}</strong>
            <p className="hint">Click a party to see only that party’s units.</p>
            <div>
              <label htmlFor="unit-name">Unit</label>
              <input id="unit-name" value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="Unit name" />
            </div>
            <div className="tools">
              <button className="btn" disabled={busy || !selected} type="submit">{busy ? 'Saving…' : editingUnitId ? 'Save unit' : 'Add unit'}</button>
              {editingUnitId && (
                <button className="btn ghost" type="button" onClick={() => { setEditingUnitId(null); setUnitForm(emptyUnit); }}>Cancel</button>
              )}
            </div>
          </form>
          <section className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id}>
                    <td><strong>{unit.name}</strong></td>
                    <td><button className="btn ghost" type="button" onClick={() => editUnit(unit)}>Edit</button></td>
                  </tr>
                ))}
                {selected && !units.length && <tr><td colSpan="2">No units for this party.</td></tr>}
                {!selected && <tr><td colSpan="2">Choose a party.</td></tr>}
              </tbody>
            </table>
          </section>
        </section>
      </div>
    </div>
  );
}
