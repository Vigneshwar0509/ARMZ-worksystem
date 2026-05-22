import { useState, useEffect } from 'react';
import { attendance as attApi, employees as empApi } from '../../api';
import { useToast } from '../../hooks/useToast';
import './TeamView.css';

const STATUS_COLOR = { Available:'var(--green)', Away:'var(--orange)', Busy:'var(--red)', Offline:'var(--text-muted)' };

export default function TeamView() {
  const { toast, ToastContainer } = useToast();
  const [teamRecs, setTeamRecs]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allSummary, setAllSummary] = useState([]);
  const [activeTab, setActiveTab] = useState('today');
  const [sumYear, setSumYear]     = useState(new Date().getFullYear());
  const [sumMonth, setSumMonth]   = useState(new Date().getMonth() + 1);
  const [loading, setLoading]     = useState(false);

  useEffect(() => { fetchToday(); fetchEmployees(); }, []);

  const fetchToday = async () => {
    try {
      const data = await attApi.team();
      setTeamRecs(data);
    } catch (e) { toast(e.message, 'error'); }
  };

  const fetchEmployees = async () => {
    try { setEmployees(await empApi.getAll()); } catch {}
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await attApi.allSummary(sumYear, sumMonth);
      setAllSummary(data);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (activeTab === 'summary') fetchSummary(); }, [activeTab, sumYear, sumMonth]);

  const checkedIn  = teamRecs.filter(r => r.checkIn && !r.checkOut);
  const checkedOut = teamRecs.filter(r => r.checkIn && r.checkOut);
  const notIn      = employees.filter(e => !teamRecs.find(r => r.employeeId === e.id));

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="team-page">
      <ToastContainer />
      <div className="page-header">
        <div className="page-title">Team View</div>
        <div className="page-sub">Monitor team attendance and activity</div>
      </div>

      {/* Quick Stats */}
      <div className="team-quick-stats">
        {[
          { label:'Total Employees', val: employees.length, color:'var(--blue)' },
          { label:'Checked In',      val: checkedIn.length, color:'var(--green)' },
          { label:'Checked Out',     val: checkedOut.length, color:'var(--orange)' },
          { label:'Not Checked In',  val: notIn.length,     color:'var(--red)' },
        ].map(s => (
          <div key={s.label} className="tqs-card" style={{ borderLeft: `3px solid ${s.color}` }}>
            <div className="tqs-val" style={{ color: s.color }}>{s.val}</div>
            <div className="tqs-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="team-tabs">
        {['today','summary'].map(t => (
          <button key={t} className={`team-tab ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
            {t === 'today' ? "Today's Attendance" : 'Monthly Summary'}
          </button>
        ))}
      </div>

      {activeTab === 'today' && (
        <div className="team-today-grid">
          {/* Currently Working */}
          <div className="card">
            <div className="team-section-title" style={{ color:'var(--green)' }}>✓ Currently Working ({checkedIn.length})</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Check In</th><th>Mode</th><th>Hours</th></tr></thead>
                <tbody>
                  {checkedIn.length === 0
                    ? <tr><td colSpan={4} style={{textAlign:'center', color:'var(--text-muted)', padding:20}}>No one checked in yet</td></tr>
                    : checkedIn.map(r => {
                        const now = new Date();
                        const [h,m] = (r.checkIn||'00:00').split(':').map(Number);
                        const hrs = Math.max(0, (now.getHours() - h) + (now.getMinutes() - m)/60).toFixed(1);
                        return (
                          <tr key={r.id}>
                            <td style={{color:'var(--text)', fontWeight:500}}>{r.employeeName}</td>
                            <td>{r.checkIn}</td>
                            <td><span className={`badge ${r.mode==='WFO'?'badge-green':'badge-orange'}`}>{r.mode}</span></td>
                            <td style={{color:'var(--accent)', fontWeight:700}}>{hrs}h</td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Checked Out */}
          <div className="card">
            <div className="team-section-title" style={{ color:'var(--blue)' }}>✓ Checked Out ({checkedOut.length})</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>In</th><th>Out</th><th>Hours</th></tr></thead>
                <tbody>
                  {checkedOut.length === 0
                    ? <tr><td colSpan={4} style={{textAlign:'center', color:'var(--text-muted)', padding:20}}>None yet</td></tr>
                    : checkedOut.map(r => (
                        <tr key={r.id}>
                          <td style={{color:'var(--text)', fontWeight:500}}>{r.employeeName}</td>
                          <td>{r.checkIn}</td>
                          <td>{r.checkOut}</td>
                          <td style={{color:'var(--accent)', fontWeight:700}}>{r.totalHours}h</td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Not Checked In */}
          <div className="card team-absent-card">
            <div className="team-section-title" style={{ color:'var(--red)' }}>✗ Not Checked In ({notIn.length})</div>
            <div className="absent-list">
              {notIn.length === 0
                ? <div style={{color:'var(--text-muted)', fontSize:13}}>Everyone has checked in!</div>
                : notIn.map(e => (
                    <div key={e.id} className="absent-row">
                      <div className="absent-avatar">{e.name.slice(0,2).toUpperCase()}</div>
                      <div>
                        <div style={{fontSize:13, fontWeight:500, color:'var(--text)'}}>{e.name}</div>
                        <div style={{fontSize:11, color:'var(--text-muted)'}}>{e.designation}</div>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {activeTab === 'summary' && (
        <div>
          <div className="summary-filter card">
            <div className="form-group">
              <label className="form-label">Year</label>
              <select className="input" value={sumYear} onChange={e => setSumYear(Number(e.target.value))}>
                {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="input" value={sumMonth} onChange={e => setSumMonth(Number(e.target.value))}>
                {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
              </select>
            </div>
            <button className="btn btn-accent" onClick={fetchSummary} style={{alignSelf:'flex-end'}}>Refresh</button>
          </div>

          <div className="card">
            <div className="table-wrap">
              {loading ? <div className="loading"><div className="spinner"/></div> : (
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th><th>Dept</th><th>WFO</th><th>WFH</th>
                      <th>Absent</th><th>Leave</th><th>Present</th>
                      <th>Total Hrs</th><th>Effective Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSummary.length === 0
                      ? <tr><td colSpan={9} style={{textAlign:'center', padding:32, color:'var(--text-muted)'}}>No data</td></tr>
                      : allSummary.map(s => (
                          <tr key={s.employeeId}>
                            <td style={{fontWeight:500, color:'var(--text)'}}>{s.employeeName}</td>
                            <td style={{color:'var(--text-muted)', fontSize:12}}>—</td>
                            <td><span className="badge badge-green">{s.wFO}</span></td>
                            <td><span className="badge badge-orange">{s.wFH}</span></td>
                            <td><span className="badge badge-red">{s.absent}</span></td>
                            <td><span className="badge badge-blue">{s.onLeave}</span></td>
                            <td style={{fontWeight:700, color:'var(--text)'}}>{s.totalWorkingDays}</td>
                            <td style={{color:'var(--accent)', fontWeight:600}}>{s.totalHours}h</td>
                            <td style={{color:'var(--teal)', fontWeight:600}}>{s.effectiveHours}h</td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
