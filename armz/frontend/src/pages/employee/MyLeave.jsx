import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leave as leaveApi } from '../../api';
import { useToast } from '../../hooks/useToast';
import './MyLeave.css';

const LEAVE_TYPES = ['CasualLeave','SickLeave','EarnedLeave','CompOff'];
const LEAVE_LABELS = { CasualLeave:'Casual Leave', SickLeave:'Sick Leave', EarnedLeave:'Earned Leave', CompOff:'Comp Off', UnpaidLeave:'Unpaid Leave' };

const STATUS_BADGE = {
  Pending:   'badge-orange',
  Approved:  'badge-green',
  Rejected:  'badge-red',
  Cancelled: 'badge-muted',
};

export default function MyLeave() {
  const { user }                  = useAuth();
  const { toast, ToastContainer } = useToast();

  const [leaves, setLeaves]     = useState([]);
  const [balance, setBalance]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ leaveType:'CasualLeave', fromDate:'', toDate:'', reason:'' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [l, b] = await Promise.all([
        leaveApi.my(user.id),
        leaveApi.balance(user.id, new Date().getFullYear()),
      ]);
      setLeaves(l);
      setBalance(b);
    } catch (e) { toast(e.message, 'error'); }
  };

  const handleApply = async () => {
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      toast('Please fill all fields', 'error'); return;
    }
    setSaving(true);
    try {
      await leaveApi.apply({ employeeId: user.id, ...form });
      toast('Leave applied successfully!', 'success');
      setShowForm(false);
      setForm({ leaveType:'CasualLeave', fromDate:'', toDate:'', reason:'' });
      fetchData();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await leaveApi.cancel(id, user.id);
      toast('Leave cancelled', 'success');
      fetchData();
    } catch { toast('Cannot cancel this leave', 'error'); }
  };

  const BAL_CARDS = balance ? [
    { label:'Casual Leave',  total: balance.casualTotal,  used: balance.casualUsed,  avail: balance.casualAvail,  color:'var(--blue)' },
    { label:'Sick Leave',    total: balance.sickTotal,    used: balance.sickUsed,    avail: balance.sickAvail,    color:'var(--red)' },
    { label:'Earned Leave',  total: balance.earnedTotal,  used: balance.earnedUsed,  avail: balance.earnedAvail,  color:'var(--green)' },
    { label:'Comp Off',      total: balance.compOffTotal, used: balance.compOffUsed, avail: balance.compOffAvail, color:'var(--purple)' },
  ] : [];

  return (
    <div className="leave-page">
      <ToastContainer />
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div className="page-title">My Leave</div>
          <div className="page-sub">View and apply for leaves</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Close' : '+ Apply Leave'}
        </button>
      </div>

      {/* Balance */}
      {balance && (
        <div className="leave-balance-grid">
          {BAL_CARDS.map(b => (
            <div key={b.label} className="bal-card" style={{ borderTop: `3px solid ${b.color}` }}>
              <div className="bal-label">{b.label}</div>
              <div className="bal-numbers">
                <div className="bal-avail" style={{ color: b.color }}>{b.avail}</div>
                <div className="bal-detail">of {b.total} · {b.used} used</div>
              </div>
              <div className="bal-bar">
                <div className="bal-fill" style={{ width: `${Math.min(100,(b.used/b.total)*100)}%`, background: b.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Form */}
      {showForm && (
        <div className="card apply-form">
          <div className="apply-title">Apply for Leave</div>
          <div className="apply-grid">
            <div className="form-group">
              <label className="form-label">Leave Type</label>
              <select className="input" value={form.leaveType} onChange={e => setForm(f => ({...f, leaveType: e.target.value}))}>
                {LEAVE_TYPES.map(t => <option key={t} value={t}>{LEAVE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="input" value={form.fromDate} onChange={e => setForm(f => ({...f, fromDate: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="input" value={form.toDate} onChange={e => setForm(f => ({...f, toDate: e.target.value}))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Reason</label>
              <textarea className="input" rows={3} placeholder="Reason for leave…"
                value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop: 4 }}>
            <button className="btn btn-primary" onClick={handleApply} disabled={saving}>{saving ? 'Applying…' : 'Submit Request'}</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Leave History */}
      <div className="card">
        <div className="section-title">Leave History</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Type</th><th>From</th><th>To</th>
                <th>Days</th><th>Reason</th><th>Status</th>
                <th>Approver</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr><td colSpan={9} style={{textAlign:'center', padding:32, color:'var(--text-muted)'}}>No leave requests found</td></tr>
              ) : leaves.map((l, i) => (
                <tr key={l.id}>
                  <td style={{color:'var(--text-muted)'}}>{i+1}</td>
                  <td><span className="badge badge-blue">{LEAVE_LABELS[l.leaveType] || l.leaveType}</span></td>
                  <td style={{whiteSpace:'nowrap'}}>{l.fromDate}</td>
                  <td style={{whiteSpace:'nowrap'}}>{l.toDate}</td>
                  <td style={{textAlign:'center', fontWeight:700, color:'var(--text)'}}>{l.totalDays}</td>
                  <td style={{maxWidth:200, color:'var(--text-muted)', fontSize:12}}>{l.reason}</td>
                  <td><span className={`badge ${STATUS_BADGE[l.status] || 'badge-muted'}`}>{l.status}</span></td>
                  <td style={{fontSize:12, color:'var(--text-muted)'}}>{l.approverName || '—'}</td>
                  <td>
                    {l.status === 'Pending' && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleCancel(l.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
