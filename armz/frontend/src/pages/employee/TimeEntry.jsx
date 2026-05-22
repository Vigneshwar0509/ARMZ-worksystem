import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { timeEntries as teApi, projects as projApi } from '../../api';
import { useToast } from '../../hooks/useToast';
import './TimeEntry.css';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };
const monthEnd   = () => {
  const d = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export default function TimeEntry() {
  const { user }                   = useAuth();
  const { toast, ToastContainer }  = useToast();
  const [projects, setProjects]    = useState([]);
  const [entries, setEntries]      = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [form, setForm]            = useState({ projectId:'', description:'', hours:'', date: todayStr() });
  const [editId, setEditId]        = useState(null);
  const [from, setFrom]            = useState(monthStart());
  const [to, setTo]                = useState(monthEnd());
  const [saving, setSaving]        = useState(false);

  useEffect(() => {
    projApi.getAll().then(p => setProjects(p.filter(x => x.isActive)));
  }, []);

  const loadEntries = async () => {
    try {
      const data = await teApi.get(user.id, from, to);
      setEntries(data);
    } catch (e) { toast(e.message, 'error'); }
  };

  useEffect(() => { if (user) loadEntries(); }, [user]);

  const selProject = projects.find(p => p.id === Number(form.projectId));

  const handleSave = async () => {
    if (!form.projectId || !form.hours || !form.description.trim()) {
      toast('Please fill all fields', 'error'); return;
    }
    setSaving(true);
    try {
      const payload = {
        employeeId: user.id, projectId: Number(form.projectId),
        entryDate: form.date, hours: Number(form.hours),
        description: form.description,
      };
      if (editId) {
        await teApi.update(editId, { projectId: payload.projectId, entryDate: payload.entryDate, hours: payload.hours, description: payload.description });
        toast('Entry updated!', 'success');
        setEditId(null);
      } else {
        await teApi.create(payload);
        toast('Time entry saved!', 'success');
      }
      setForm({ projectId:'', description:'', hours:'', date: todayStr() });
      loadEntries();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = (e) => {
    setForm({ projectId: String(e.projectId), description: e.description, hours: String(e.hours), date: e.entryDate.split('/').reverse().join('-') });
    setEditId(e.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    try { await teApi.delete(id); toast('Deleted', 'success'); loadEntries(); }
    catch (e) { toast(e.message, 'error'); }
  };

  const toggleRow  = (id) => setSelectedRows(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);
  const toggleAll  = () => setSelectedRows(selectedRows.length === entries.length ? [] : entries.map(e => e.id));
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="te-page">
      <ToastContainer />
      <div className="page-header">
        <div className="page-title">Time Entry</div>
        <div className="page-sub">Log your daily work hours</div>
      </div>

      {/* Form */}
      <div className="card te-form">
        <div className="te-form-title">{editId ? '✎ Edit Entry' : '+ Log Time'}</div>
        <div className="te-grid">
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="input" value={form.projectId} onChange={e => setForm(f => ({...f, projectId: e.target.value}))}>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.clientName} — {p.name}</option>)}
            </select>
          </div>
          {selProject && (
            <div className="form-group">
              <label className="form-label">Client</label>
              <div className="input" style={{color:'var(--text-muted)'}}>{selProject.clientName}</div>
            </div>
          )}
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Description</label>
            <textarea className="input" placeholder="Describe the work done…" rows={3}
              value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} maxLength={5000} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign:'right' }}>{form.description.length}/5000</span>
          </div>
          <div className="form-group">
            <label className="form-label">Duration (Hours)</label>
            <input type="number" className="input" placeholder="0.00" min="0.5" max="24" step="0.5"
              value={form.hours} onChange={e => setForm(f => ({...f, hours: e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Entry Date</label>
            <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} />
          </div>
        </div>
        <div className="te-form-footer">
          <button className="btn btn-accent" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Entry' : 'Report Time'}</button>
          {editId && <button className="btn btn-outline" onClick={() => { setEditId(null); setForm({projectId:'',description:'',hours:'',date:todayStr()}); }}>Cancel</button>}
          <div className="te-total-badge">
            Hours Reported: <strong style={{color: totalHours > 0 ? 'var(--accent)' : 'var(--red)'}}>{totalHours.toFixed(1)}h</strong>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="card te-filter">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button className="btn btn-accent" onClick={loadEntries} style={{alignSelf:'flex-end'}}>Show</button>
      </div>

      {/* Table */}
      <div className="card te-table-card">
        <div className="te-table-title">Time Entry Log</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectedRows.length === entries.length && entries.length > 0} onChange={toggleAll} /></th>
                <th>Date</th><th>Client</th><th>Project</th><th>Description</th><th>Hours</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign:'center', color:'var(--text-muted)', padding: 32}}>No entries. Click Show to load.</td></tr>
              ) : entries.map(e => (
                <tr key={e.id} className={selectedRows.includes(e.id) ? 'selected-row' : ''}>
                  <td><input type="checkbox" checked={selectedRows.includes(e.id)} onChange={() => toggleRow(e.id)} /></td>
                  <td style={{whiteSpace:'nowrap', color:'var(--text)'}}>{e.entryDate}</td>
                  <td><span className="badge badge-blue">{e.clientName}</span></td>
                  <td style={{color:'var(--text)'}}>{e.projectName}</td>
                  <td style={{maxWidth: 280, color:'var(--text-muted)', fontSize:12}}>{e.description}</td>
                  <td><span style={{color:'var(--accent)', fontWeight:700}}>{e.hours.toFixed(1)}</span></td>
                  <td>
                    <div style={{display:'flex', gap:6}}>
                      <button className="btn btn-ghost btn-icon" onClick={() => handleEdit(e)} title="Edit">✎</button>
                      <button className="btn btn-ghost btn-icon" style={{color:'var(--red)'}} onClick={() => handleDelete(e.id)} title="Delete">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {entries.length > 0 && (
                <tr className="total-row">
                  <td colSpan={5} style={{textAlign:'right', color:'var(--text-muted)', fontSize:12}}>Total ({entries.length} entries)</td>
                  <td style={{color:'var(--primary)', fontWeight:700, fontSize:15}}>{totalHours.toFixed(1)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
