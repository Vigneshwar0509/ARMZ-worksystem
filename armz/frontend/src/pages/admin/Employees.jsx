import { useState, useEffect } from 'react';
import { employees as empApi } from '../../api';
import { useToast } from '../../hooks/useToast';
import './Employees.css';

const ROLES  = ['Employee','Intern','Admin','Manager'];
const DEPTS  = ['IT','Sales','Sales Intern','IT intern','Admin'];

const EMPTY_FORM = { name:'', username:'', email:'', password:'', role:'Employee', department:'IT', designation:'', phone:'', joinDate:'', managerId:'', isActive:true }; 

const Field = ({ label, field, type='text', opts, form, setForm }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    {opts ? (
      <select className="input" value={form[field]} onChange={e => setForm(f=>({...f,[field]:e.target.value}))}>
        {opts.map(o => <option key={o.val||o} value={o.val||o}>{o.label||o}</option>)}
      </select>
    ) : (
      <input type={type} className="input" value={form[field]}
        onChange={e => setForm(f=>({...f,[field]:e.target.value}))} />
    )}
  </div>
);

export default function Employees() {
  const { toast, ToastContainer } = useToast();
  const [employees, setEmployees] = useState([]);
  const [modal, setModal]         = useState(null); // 'add' | 'edit' | 'reset'
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editId, setEditId]       = useState(null);
  const [resetId, setResetId]     = useState(null);
  const [newPwd, setNewPwd]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { setEmployees(await empApi.getAll()); } catch (e) { toast(e.message,'error'); }
  };

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = (e) => {
    setForm({ name:e.name, username:e.username, email:e.email||'', password:'', role:e.role, department:e.department,
              designation:e.designation, phone:e.phone||'', joinDate:e.joinDate, managerId:String(e.managerId||''), isActive: e.isActive });
    setEditId(e.id); setModal('edit');
  }; 
  const openReset = (id) => { setResetId(id); setNewPwd(''); setModal('reset'); };

  const handleSave = async () => {
    if (!form.name || !form.username || (!editId && !form.password) || !form.designation) {
      toast('Fill all required fields', 'error'); return;
    }
    setSaving(true);
    try {
      if (editId) {
        await empApi.update(editId, {
          name:form.name, username:form.username, email:form.email||null, role:form.role,
          department:form.department, designation:form.designation,
          phone:form.phone||null, managerId:form.managerId?Number(form.managerId):null,
          isActive: !!form.isActive,
        });
        toast('Employee updated!', 'success');
      } else {
        await empApi.create({
          name:form.name, username:form.username, email:form.email||null, password:form.password,
          role:form.role, department:form.department, designation:form.designation,
          phone:form.phone||null,
          joinDate:form.joinDate || new Date().toISOString().slice(0,10),
          managerId:form.managerId?Number(form.managerId):null,
          isActive: !!form.isActive,
        });
        toast('Employee created!', 'success');
      }
      setModal(null);
      fetchAll();
    } catch (e) { toast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!newPwd || newPwd.length < 6) { toast('Password min 6 chars', 'error'); return; }
    setSaving(true);
    try {
      await empApi.resetPassword(resetId, newPwd);
      toast('Password reset!', 'success');
      setModal(null);
    } catch (e) { toast(e.message,'error'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this employee?')) return;
    try { await empApi.delete(id); toast('Deactivated', 'success'); fetchAll(); }
    catch (e) { toast(e.message,'error'); }
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase()) ||
    (e.email || '').toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const ROLE_BADGE = { Admin:'badge-red', Manager:'badge-purple', Employee:'badge-muted' };
  const managers   = employees.filter(e => e.role === 'Manager' || e.role === 'Admin');

  return (
    <div className="employees-page">
      <ToastContainer />
      <div className="page-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div>
          <div className="page-title">Employees</div>
          <div className="page-sub">{employees.length} active employees</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Employee</button>
      </div>

      {/* Search */}
      <div className="emp-search-bar card">
        <input className="input" placeholder="🔍  Search by name, email or code…"
          value={search} onChange={e => setSearch(e.target.value)} style={{maxWidth:360}} />
        <div style={{marginLeft:'auto', fontSize:13, color:'var(--text-muted)'}}>{filtered.length} results</div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Username</th><th>Name</th><th>Email</th><th>Department</th>
                <th>Designation</th><th>Role</th><th>Manager</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9} style={{textAlign:'center', padding:32, color:'var(--text-muted)'}}>No employees found</td></tr>
                : filtered.map(e => (
                    <tr key={e.id}>
                      <td data-label="Code"><span className="badge badge-muted">{e.employeeCode}</span></td>
                      <td data-label="Username" style={{fontSize:12, color:'var(--text-muted)'}}>{e.username}</td>
                      <td data-label="Name">
                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                          <div className="emp-avatar">{e.name.slice(0,2).toUpperCase()}</div>
                          <span style={{fontWeight:500, color:'var(--text)'}}>{e.name}</span>
                        </div>
                      </td>
                      <td data-label="Email" style={{fontSize:12, color:'var(--text-muted)'}}>{e.email || '—'}</td>
                      <td data-label="Department" style={{fontSize:12}}>{e.department}</td>
                      <td data-label="Designation" style={{fontSize:12}}>{e.designation}</td>
                      <td data-label="Role"><span className={`badge ${ROLE_BADGE[e.role]||'badge-muted'}`}>{e.role}</span></td>
                      <td data-label="Manager" style={{fontSize:12, color:'var(--text-muted)'}}>{e.managerName||'—'}</td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => openReset(e.id)}>Reset Pwd</button>
                          <button className="btn btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={() => handleDeactivate(e.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{maxWidth:560}} onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === 'add' ? '+ Add Employee' : '✎ Edit Employee'}</div>
            <div className="emp-form-grid">
              <Field label="Full Name *"   field="name" form={form} setForm={setForm} />
              <Field label="Username *"    field="username" form={form} setForm={setForm} />
              <Field label="Email"         field="email" type="email" form={form} setForm={setForm} />
              {!editId && <Field label="Password *" field="password" type="password" form={form} setForm={setForm} />}
              <Field label="Role"         field="role" opts={ROLES} form={form} setForm={setForm} />
              <Field label="Department"   field="department" opts={DEPTS} form={form} setForm={setForm} />
              <Field label="Designation *" field="designation" form={form} setForm={setForm} />
              <Field label="Phone"        field="phone" form={form} setForm={setForm} />
              <Field label="Join Date"    field="joinDate" type="date" form={form} setForm={setForm} />
              <div className="form-group">
                <label className="form-label">Manager</label>
                <select className="input" value={form.managerId} onChange={e => setForm(f=>({...f,managerId:e.target.value}))}>
                  <option value="">— None —</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{display:'flex',alignItems:'center',gap:8}}>
                <label className="form-label">Active</label>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f=>({...f,isActive:e.target.checked}))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : modal==='add' ? 'Create Employee' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {modal === 'reset' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🔑 Reset Password</div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="input" placeholder="Min 6 characters"
                value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReset} disabled={saving}>{saving ? 'Resetting…' : 'Reset Password'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
