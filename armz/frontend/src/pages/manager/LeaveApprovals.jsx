import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leave as leaveApi } from '../../api';
import { useToast } from '../../hooks/useToast';
import './LeaveApprovals.css';

const STATUS_BADGE = { Pending:'badge-orange', Approved:'badge-green', Rejected:'badge-red', Cancelled:'badge-muted' };
const LEAVE_LABELS = { CasualLeave:'Casual', SickLeave:'Sick', EarnedLeave:'Earned', CompOff:'CompOff', UnpaidLeave:'Unpaid' };

export default function LeaveApprovals() {
  const { user }                  = useAuth();
  const { toast, ToastContainer } = useToast();

  const [pending, setPending]   = useState([]);
  const [all, setAll]           = useState([]);
  const [tab, setTab]           = useState('pending');
  const [year, setYear]         = useState(new Date().getFullYear());
  const [actionModal, setActionModal] = useState(null); // { leaveId, action }
  const [comments, setComments]  = useState('');
  const [saving, setSaving]      = useState(false);

  useEffect(() => { fetchPending(); }, []);
  useEffect(() => { if (tab === 'all') fetchAll(); }, [tab, year]);

  const exportCSV = (rows, cols, filename) => {
    const header = cols.map(c => c.label).join(',');
    const body   = rows.map(r => cols.map(c => `"${r[c.key] ?? ''}"`).join(',')).join('\n');
    const blob   = new Blob([header + '\n' + body], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = filename; a.click();
  };

  const fetchPending = async () => {
    try { setPending(await leaveApi.pending()); } catch (e) { toast(e.message,'error'); }
  };

  const fetchAll = async () => {
    try { setAll(await leaveApi.all(year)); } catch (e) { toast(e.message,'error'); }
  };

  const openAction = (leaveId, action) => { setActionModal({ leaveId, action }); setComments(''); };

  const handleAction = async () => {
    setSaving(true);
    try {
      await leaveApi.action(actionModal.leaveId, {
        approverId: user.id, action: actionModal.action, comments
      });
      toast(`Leave ${actionModal.action.toLowerCase()} successfully!`, 'success');
      setActionModal(null);
      fetchPending();
      if (tab === 'all') fetchAll();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const LeaveTable = ({ rows, showActions = false }) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Employee</th><th>Type</th><th>From</th><th>To</th>
            <th>Days</th><th>Reason</th><th>Status</th>
            <th>Applied On</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={showActions?9:8} style={{textAlign:'center', padding:32, color:'var(--text-muted)'}}>No records found</td></tr>
            : rows.map(l => (
                <tr key={l.id}>
                  <td style={{fontWeight:500, color:'var(--text)'}}>{l.employeeName}</td>
                  <td><span className="badge badge-blue">{LEAVE_LABELS[l.leaveType]||l.leaveType}</span></td>
                  <td style={{whiteSpace:'nowrap'}}>{l.fromDate}</td>
                  <td style={{whiteSpace:'nowrap'}}>{l.toDate}</td>
                  <td style={{textAlign:'center', fontWeight:700, color:'var(--text)'}}>{l.totalDays}</td>
                  <td style={{maxWidth:200, fontSize:12, color:'var(--text-muted)'}}>{l.reason}</td>
                  <td><span className={`badge ${STATUS_BADGE[l.status]||'badge-muted'}`}>{l.status}</span></td>
                  <td style={{fontSize:11, color:'var(--text-muted)', whiteSpace:'nowrap'}}>{l.appliedOn}</td>
                  {showActions && (
                    <td>
                      {l.status === 'Pending' && (
                        <div style={{display:'flex', gap:6}}>
                          <button className="btn btn-success btn-sm" onClick={() => openAction(l.id,'Approved')}>Approve</button>
                          <button className="btn btn-danger btn-sm"  onClick={() => openAction(l.id,'Rejected')}>Reject</button>
                        </div>
                      )}
                      {l.status !== 'Pending' && (
                        <span style={{fontSize:11, color:'var(--text-muted)'}}>
                          {l.approverName ? `By ${l.approverName}` : '—'}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="approvals-page">
      <ToastContainer />
      <div className="page-header">
        <div className="page-title">Leave Approvals</div>
        <div className="page-sub">Manage employee leave requests</div>
      </div>

      <div className="approvals-tabs">
        <button className={`team-tab ${tab==='pending'?'active':''}`} onClick={() => setTab('pending')}>
          Pending <span className="tab-badge">{pending.length}</span>
        </button>
        <button className={`team-tab ${tab==='all'?'active':''}`} onClick={() => setTab('all')}>All Requests</button>
      </div>

      {tab === 'pending' && (
        <div className="card">
          <div className="section-header">
            <span className="section-title-text">Pending Approval ({pending.length})</span>
          </div>
          <LeaveTable rows={pending} showActions />
        </div>
      )}

      {tab === 'all' && (
        <div>
          <div className="card filter-bar">
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
                {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn btn-accent" onClick={fetchAll} style={{alignSelf:'flex-end'}}>Refresh</button>
            {all.length > 0 && (
              <button className="btn btn-outline" style={{alignSelf:'flex-end'}}
                onClick={() => exportCSV(all, [
                  {label:'Employee',key:'employeeName'},{label:'Type',key:'leaveType'},{label:'From',key:'fromDate'},{label:'To',key:'toDate'},{label:'Days',key:'totalDays'},{label:'Status',key:'status'},{label:'Applied On',key:'appliedOn'},{label:'Approver',key:'approverName'},{label:'Comments',key:'approverComments'}
                ], `leave-requests-${year}.csv`)}>
                ↓ Export CSV
              </button>
            )}
          </div>
          <div className="card">
            <LeaveTable rows={all} showActions />
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ color: actionModal.action === 'Approved' ? 'var(--green)' : 'var(--red)' }}>
              {actionModal.action === 'Approved' ? '✓ Approve' : '✕ Reject'} Leave Request
            </div>
            <div className="form-group">
              <label className="form-label">Comments (optional)</label>
              <textarea className="input" rows={3} placeholder="Add a comment…"
                value={comments} onChange={e => setComments(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setActionModal(null)}>Cancel</button>
              <button
                className={`btn ${actionModal.action === 'Approved' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleAction} disabled={saving}
              >
                {saving ? 'Processing…' : actionModal.action === 'Approved' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
