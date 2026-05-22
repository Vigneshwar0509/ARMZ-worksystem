import { useState } from 'react';
import { attendance as attApi, timeEntries as teApi, leave as leaveApi } from '../../api';
import { useToast } from '../../hooks/useToast';
import './Reports.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Reports() {
  const { toast, ToastContainer } = useToast();
  const [tab, setTab]         = useState('attendance-summary');
  const [year, setYear]       = useState(2026);
  const [month, setMonth]     = useState(5);
  const [from, setFrom]       = useState('2026-05-01');
  const [to, setTo]           = useState('2026-05-31');
  const [attData, setAttData] = useState([]);
  const [attRecords, setAttRecords] = useState([]);
  const [teData, setTeData]   = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    try { setAttData(await attApi.allSummary(year, month)); }
    catch (e) { toast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try { setAttRecords(await attApi.allRecords(from, to)); }
    catch (e) { toast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const fetchTimesheet = async () => {
    setLoading(true);
    try { setTeData(await teApi.getAll(from, to)); }
    catch (e) { toast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const fetchLeaveRecords = async () => {
    setLoading(true);
    try { setLeaveData(await leaveApi.all(year)); }
    catch (e) { toast(e.message,'error'); }
    finally { setLoading(false); }
  };

  const totalHours = teData.reduce((s,e) => s+e.hours, 0);

  const exportCSV = (rows, cols, filename) => {
    const header = cols.map(c => c.label).join(',');
    const body   = rows.map(r => cols.map(c => `"${r[c.key] ?? ''}"`).join(',')).join('\n');
    const blob   = new Blob([header + '\n' + body], { type:'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = filename; a.click();
  };

  return (
    <div className="reports-page">
      <ToastContainer />
      <div className="page-header">
        <div className="page-title">Reports</div>
        <div className="page-sub">Export attendance, timesheet and leave records for admin review</div>
      </div>

      <div className="report-tabs">
        {['attendance-summary','attendance-records','timesheet','leaves'].map(t => (
          <button key={t} className={`team-tab ${tab===t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'attendance-summary' && '📋 Attendance Summary'}
            {t === 'attendance-records' && '🕒 Attendance Records'}
            {t === 'timesheet' && '⏱ Timesheet Report'}
            {t === 'leaves' && '✈ Leave Requests'}
          </button>
        ))}
      </div>

      {tab === 'attendance-summary' && (
        <div>
          <div className="card report-filter">
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
                {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
              </select>
            </div>
            <button className="btn btn-accent" onClick={fetchAttendance} style={{alignSelf:'flex-end'}}>Generate</button>
            {attData.length > 0 && (
              <button className="btn btn-outline" style={{alignSelf:'flex-end'}}
                onClick={() => exportCSV(attData, [
                  {label:'Employee',key:'employeeName'},{label:'WFO',key:'wFO'},{label:'WFH',key:'wFH'},
                  {label:'Absent',key:'absent'},{label:'Leave',key:'onLeave'},
                  {label:'Total Hrs',key:'totalHours'},{label:'Effective Hrs',key:'effectiveHours'}
                ], `attendance-summary-${MONTHS[month-1]}-${year}.csv`)}>
                ↓ Export CSV
              </button>
            )}
          </div>

          {loading && <div className="loading"><div className="spinner"/></div>}

          {!loading && attData.length > 0 && (
            <>
              <div className="report-summary-cards">
                <div className="rsc"><div className="rsc-val">{attData.length}</div><div className="rsc-label">Employees</div></div>
                <div className="rsc"><div className="rsc-val" style={{color:'var(--green)'}}>{attData.reduce((s,r)=>s+r.wFO,0)}</div><div className="rsc-label">Total WFO Days</div></div>
                <div className="rsc"><div className="rsc-val" style={{color:'var(--orange)'}}>{attData.reduce((s,r)=>s+r.wFH,0)}</div><div className="rsc-label">Total WFH Days</div></div>
                <div className="rsc"><div className="rsc-val" style={{color:'var(--red)'}}>{attData.reduce((s,r)=>s+r.absent,0)}</div><div className="rsc-label">Total Absences</div></div>
                <div className="rsc"><div className="rsc-val" style={{color:'var(--accent)'}}>{attData.reduce((s,r)=>s+r.totalHours,0).toFixed(0)}</div><div className="rsc-label">Total Hours</div></div>
              </div>

              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th><th>WFO</th><th>WFH</th><th>Absent</th>
                        <th>Leave</th><th>Present</th><th>Total Hrs</th><th>Effective Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attData.map(r => (
                        <tr key={r.employeeId}>
                          <td style={{fontWeight:500, color:'var(--text)'}}>{r.employeeName}</td>
                          <td><span className="badge badge-green">{r.wFO}</span></td>
                          <td><span className="badge badge-orange">{r.wFH}</span></td>
                          <td><span className="badge badge-red">{r.absent}</span></td>
                          <td><span className="badge badge-blue">{r.onLeave}</span></td>
                          <td style={{fontWeight:700, color:'var(--text)'}}>{r.totalWorkingDays}</td>
                          <td style={{color:'var(--accent)', fontWeight:600}}>{r.totalHours}h</td>
                          <td style={{color:'var(--teal)', fontWeight:600}}>{r.effectiveHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'attendance-records' && (
        <div>
          <div className="card report-filter">
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button className="btn btn-accent" onClick={fetchAttendanceRecords} style={{alignSelf:'flex-end'}}>Generate</button>
            {attRecords.length > 0 && (
              <button className="btn btn-outline" style={{alignSelf:'flex-end'}}
                onClick={() => exportCSV(attRecords, [
                  {label:'Employee',key:'employeeName'},{label:'Date',key:'date'},{label:'Check In',key:'checkIn'},{label:'Check Out',key:'checkOut'},{label:'Mode',key:'mode'},{label:'Status',key:'status'},{label:'Total Hrs',key:'totalHours'},{label:'Effective Hrs',key:'effectiveHours'},{label:'Notes',key:'notes'}
                ], `attendance-records-${from}-to-${to}.csv`)}>
                ↓ Export CSV
              </button>
            )}
          </div>

          {loading && <div className="loading"><div className="spinner"/></div>}

          {!loading && attRecords.length > 0 && (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Employee</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Mode</th><th>Status</th><th>Total Hrs</th><th>Effective Hrs</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {attRecords.map(r => (
                      <tr key={`${r.employeeId}-${r.date}-${r.checkIn}`}> 
                        <td style={{fontWeight:500, color:'var(--text)'}}>{r.employeeName}</td>
                        <td style={{whiteSpace:'nowrap'}}>{r.date}</td>
                        <td>{r.checkIn || '—'}</td>
                        <td>{r.checkOut || '—'}</td>
                        <td>{r.mode}</td>
                        <td>{r.status}</td>
                        <td>{r.totalHours}</td>
                        <td>{r.effectiveHours}</td>
                        <td style={{maxWidth:220, fontSize:12, color:'var(--text-muted)'}}>{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'leaves' && (
        <div>
          <div className="card report-filter">
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
                {[2025,2026,2027].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <button className="btn btn-accent" onClick={fetchLeaveRecords} style={{alignSelf:'flex-end'}}>Generate</button>
            {leaveData.length > 0 && (
              <button className="btn btn-outline" style={{alignSelf:'flex-end'}}
                onClick={() => exportCSV(leaveData, [
                  {label:'Employee',key:'employeeName'},{label:'Type',key:'leaveType'},{label:'From',key:'fromDate'},{label:'To',key:'toDate'},{label:'Days',key:'totalDays'},{label:'Status',key:'status'},{label:'Applied On',key:'appliedOn'},{label:'Approver',key:'approverName'},{label:'Comments',key:'approverComments'}
                ], `leave-records-${year}.csv`)}>
                ↓ Export CSV
              </button>
            )}
          </div>

          {loading && <div className="loading"><div className="spinner"/></div>}

          {!loading && leaveData.length > 0 && (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Applied On</th><th>Approver</th><th>Comments</th></tr>
                  </thead>
                  <tbody>
                    {leaveData.map(l => (
                      <tr key={l.id}>
                        <td style={{fontWeight:500, color:'var(--text)'}}>{l.employeeName}</td>
                        <td>{l.leaveType}</td>
                        <td style={{whiteSpace:'nowrap'}}>{l.fromDate}</td>
                        <td style={{whiteSpace:'nowrap'}}>{l.toDate}</td>
                        <td style={{textAlign:'center', fontWeight:700}}>{l.totalDays}</td>
                        <td><span className={`badge badge-${l.status === 'Approved' ? 'green' : l.status === 'Rejected' ? 'red' : l.status === 'Cancelled' ? 'muted' : 'orange'}`}>{l.status}</span></td>
                        <td style={{whiteSpace:'nowrap', fontSize:12, color:'var(--text-muted)'}}>{l.appliedOn}</td>
                        <td style={{fontSize:12}}>{l.approverName || '—'}</td>
                        <td style={{maxWidth:220, fontSize:12, color:'var(--text-muted)'}}>{l.approverComments || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'timesheet' && (
        <div>
          <div className="card report-filter">
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button className="btn btn-accent" onClick={fetchTimesheet} style={{alignSelf:'flex-end'}}>Generate</button>
            {teData.length > 0 && (
              <button className="btn btn-outline" style={{alignSelf:'flex-end'}}
                onClick={() => exportCSV(teData, [
                  {label:'Employee',key:'employeeName'},{label:'Date',key:'entryDate'},
                  {label:'Client',key:'clientName'},{label:'Project',key:'projectName'},
                  {label:'Description',key:'description'},{label:'Hours',key:'hours'}
                ], `timesheet-${from}-to-${to}.csv`)}>
                ↓ Export CSV
              </button>
            )}
          </div>

          {loading && <div className="loading"><div className="spinner"/></div>}

          {!loading && teData.length > 0 && (
            <>
              <div className="report-summary-cards">
                <div className="rsc"><div className="rsc-val">{teData.length}</div><div className="rsc-label">Total Entries</div></div>
                <div className="rsc"><div className="rsc-val" style={{color:'var(--accent)'}}>{totalHours.toFixed(1)}</div><div className="rsc-label">Total Hours</div></div>
                <div className="rsc"><div className="rsc-val" style={{color:'var(--blue)'}}>{[...new Set(teData.map(e=>e.employeeName))].length}</div><div className="rsc-label">Employees</div></div>
                <div className="rsc"><div className="rsc-val" style={{color:'var(--green)'}}>{[...new Set(teData.map(e=>e.projectName))].length}</div><div className="rsc-label">Projects</div></div>
              </div>

              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Employee</th><th>Date</th><th>Client</th><th>Project</th><th>Description</th><th>Hours</th></tr>
                    </thead>
                    <tbody>
                      {teData.map(e => (
                        <tr key={e.id}>
                          <td style={{fontWeight:500, color:'var(--text)'}}>{e.employeeName}</td>
                          <td style={{whiteSpace:'nowrap'}}>{e.entryDate}</td>
                          <td><span className="badge badge-blue">{e.clientName}</span></td>
                          <td style={{color:'var(--text)'}}>{e.projectName}</td>
                          <td style={{maxWidth:240, fontSize:12, color:'var(--text-muted)'}}>{e.description}</td>
                          <td style={{color:'var(--accent)', fontWeight:700}}>{e.hours.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr style={{background:'var(--bg-card2)'}}>
                        <td colSpan={5} style={{textAlign:'right', fontWeight:600, color:'var(--text-muted)', fontSize:12}}>Total</td>
                        <td style={{color:'var(--primary)', fontWeight:700, fontSize:15}}>{totalHours.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
