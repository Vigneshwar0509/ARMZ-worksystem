import { useState, useEffect } from 'react';
import { projects as projApi } from '../../api';
import { useToast } from '../../hooks/useToast';

export default function Projects() {
  const { toast, ToastContainer } = useToast();
  const [projects, setProjects]   = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState({ name:'', clientName:'' });
  const [saving, setSaving]       = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setProjects(await projApi.getAll()); } catch (e) { toast(e.message,'error'); }
  };

  const handleCreate = async () => {
    if (!form.name || !form.clientName) { toast('Fill all fields', 'error'); return; }
    setSaving(true);
    try {
      await projApi.create(form);
      toast('Project created!', 'success');
      setModal(false); setForm({ name:'', clientName:'' });
      fetchAll();
    } catch (e) { toast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try { await projApi.toggle(id); fetchAll(); toast('Status updated','success'); }
    catch (e) { toast(e.message,'error'); }
  };

  return (
    <div>
      <ToastContainer />
      <div className="page-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div>
          <div className="page-title">Projects</div>
          <div className="page-sub">Manage client projects for time entry</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Project</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Project Name</th><th>Client</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id}>
                  <td style={{color:'var(--text-muted)'}}>{i+1}</td>
                  <td style={{fontWeight:500, color:'var(--text)'}}>{p.name}</td>
                  <td><span className="badge badge-blue">{p.clientName}</span></td>
                  <td>
                    <span className={`badge ${p.isActive ? 'badge-green' : 'badge-red'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className={`btn btn-sm ${p.isActive ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggle(p.id)}>
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">+ Add Project</div>
            <div style={{display:'flex', flexDirection:'column', gap:14}}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input className="input" placeholder="e.g. Flight Ops System"
                  value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Client Name *</label>
                <input className="input" placeholder="e.g. Armz Aviation"
                  value={form.clientName} onChange={e => setForm(f=>({...f,clientName:e.target.value}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
