import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendance as attApi, employees as empApi, events as eventApi } from '../../api';
import { useToast } from '../../hooks/useToast';
import './Dashboard.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function Dashboard() {
  const { user }           = useAuth();
  const { toast, ToastContainer } = useToast();

  const [time, setTime]       = useState(new Date());
  const [status, setStatus]   = useState(null);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendanceTab, setAttendanceTab] = useState('WFO');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [checkInMode, setCheckInMode] = useState(null);
  const [calYear]             = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const today = new Date();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user, calMonth]);

  useEffect(() => {
    if (!user) return;
    const refresh = setInterval(() => fetchAttendanceDetails(), 20000);
    return () => clearInterval(refresh);
  }, [user]);

  useEffect(() => {
    if (!status?.isCheckedIn) {
      setElapsedSeconds(0);
      return;
    }

    const initial = getCheckedInSeconds(status.checkIn);
    setElapsedSeconds(initial);

    const tick = setInterval(() => setElapsedSeconds(sec => sec + 1), 1000);
    return () => clearInterval(tick);
  }, [status]);

  async function fetchAttendanceDetails() {
    try {
      const [team, employees] = await Promise.all([
        attApi.team(),
        empApi.getAll(),
      ]);
      setTeamAttendance(team);
      setEmployeeList(employees);
    } catch {}
  }

  async function fetchAll() {
    setStatusLoading(true);
    try {
      const [s, sum, recs, evts] = await Promise.all([
        attApi.today(user.id),
        attApi.summary(user.id, calYear, calMonth + 1),
        attApi.getRecords(user.id, `${calYear}-${String(calMonth+1).padStart(2,'0')}-01`,
          `${calYear}-${String(calMonth+1).padStart(2,'0')}-${new Date(calYear,calMonth+1,0).getDate()}`),
        eventApi.getAll(),
      ]);
      setStatus(s);
      setSummary(sum);
      setRecords(recs);
      setEvents(evts);
      await fetchAttendanceDetails();
    } catch {
      // Keep prior data if one of the requests fails.
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleCheckIn(selectedMode) {
    if (!selectedMode) return;
    setLoading(true);
    try {
      await attApi.checkIn(user.id, selectedMode);
      toast('Checked in successfully!', 'success');
      await fetchAll();
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); setCheckInMode(null); }
  }

  function openModeModal() {
    setCheckInMode(null);
    setIsModeModalOpen(true);
  }

  async function handleCheckOut() {
    setLoading(true);
    try {
      await attApi.checkOut(user.id);
      toast('Checked out successfully!', 'success');
      await fetchAll();
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  function getCheckedInSeconds(checkIn) {
    if (!checkIn) return 0;
    const [hour, minute] = checkIn.split(':').map(Number);
    const now = new Date();
    const then = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  }

  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  }

  function formatHoursDecimal(hours) {
    if (typeof hours !== 'number') return '—';
    const totalSeconds = Math.round(hours * 3600);
    return formatDuration(totalSeconds);
  }

  // Build calendar
  const firstDow  = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const offset    = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const recordMap = {};
  records.forEach(r => {
    const d = parseInt(r.date.split('/')[0]);
    recordMap[d] = r;
  });

  const todayDay  = today.getDate();
  const isThisMonth = today.getFullYear() === calYear && today.getMonth() === calMonth;

  const fmt = d => d.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatEventDate = date => {
    const d = new Date(date);
    return isNaN(d.getTime()) ? date : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };
  const selRec = selectedDay ? recordMap[selectedDay] : null;

  const activeEmployees = employeeList.filter(e => e.isActive);
  const pendingEmployees = activeEmployees.filter(e =>
    !teamAttendance.some(r => r.employeeId === e.id)
  );
  const wfoRecords = teamAttendance.filter(r => r.mode === 'WFO' && r.status === 'Present');
  const wfhRecords = teamAttendance.filter(r => r.mode === 'WFH' && r.status === 'Present');
  const leaveRecords = teamAttendance.filter(r => r.status === 'OnLeave');

  const attendanceRows = attendanceTab === 'WFO'
    ? wfoRecords
    : attendanceTab === 'WFH'
      ? wfhRecords
      : attendanceTab === 'Leave'
        ? leaveRecords
        : pendingEmployees;

  const attendanceCount = {
    WFO: wfoRecords.length,
    WFH: wfhRecords.length,
    Pending: pendingEmployees.length,
    Leave: leaveRecords.length,
  };

  const currentMonthEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate.getFullYear() === calYear && eventDate.getMonth() === calMonth;
  });

  return (
    <div className="dashboard">
      <ToastContainer />
      <div className="page-header">
        <div className="page-title">My Attendance</div>
        <div className="page-sub">{user?.department} · {user?.designation}</div>
      </div>

      {/* Top Row */}
      <div className="dash-top">
        {/* Clock */}
        <div className="clock-card">
          <div className="clock-emoji">📅</div>
          <div className="clock-date">{today.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
          <div className="clock-time">{fmt(time)}</div>
          <div className="clock-name">Welcome, {user?.name?.split(' ')[0]}</div>
        </div>

        {/* Today Status */}
        <div className="card status-card">
          <div className="status-top">
            <div className="status-icon">⏱</div>
            <div>
              <div className="status-heading">Today's Status</div>
              <span className={`badge ${statusLoading ? 'badge-muted' : status?.checkOut ? 'badge-orange' : status?.isCheckedIn ? 'badge-green' : status?.checkIn ? 'badge-orange' : 'badge-muted'}`}>
                {statusLoading ? 'Loading...' : status?.checkOut ? 'Checked Out' : status?.isCheckedIn ? 'Working' : status?.checkIn ? 'Checked Out' : 'Not Started'}
              </span>
            </div>
            <div className="status-actions">
              {!statusLoading && !status?.checkIn && !status?.checkOut && (
                <button className="btn btn-success btn-sm" onClick={openModeModal} disabled={loading}>
                  ↩ Check In
                </button>
              )}
              {!statusLoading && status?.isCheckedIn && !status?.checkOut && (
                <button className="btn btn-danger btn-sm" onClick={handleCheckOut} disabled={loading}>
                  ↪ Check Out
                </button>
              )}
            </div>
          </div>

          <div className="status-stats">
            <div className="ss-item"><div className="ss-label">↩ In</div><div className="ss-val">{status?.checkIn || '—'}</div></div>
            <div className="ss-item"><div className="ss-label">↪ Out</div><div className="ss-val">{status?.checkOut || '—'}</div></div>
            <div className="ss-item"><div className="ss-label">⏱ Hours</div>
              <div className="ss-val accent">
                {status?.isCheckedIn
                  ? formatDuration(elapsedSeconds)
                  : status?.hours != null
                    ? formatHoursDecimal(status.hours)
                    : '—'}
              </div>
            </div>
            <div className="ss-item"><div className="ss-label">Total Time</div>
              <div className="ss-val accent">
                {status?.checkOut != null
                  ? formatHoursDecimal(status.hours)
                  : '—'}
              </div>
            </div>
            <div className="ss-item"><div className="ss-label">Mode</div><div className="ss-val">{status?.mode || '—'}</div></div>
          </div>

          {status?.checkIn && <span className="badge badge-blue" style={{ marginTop: 4 }}>Full Day</span>}

          {isModeModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsModeModalOpen(false)}>
              <div className="mode-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">Select Work Mode</div>
                <div className="modal-copy">Choose your work location to complete check-in.</div>
                <div className="mode-options">
                  <button
                    type="button"
                    className={`mode-option ${checkInMode === 'WFO' ? 'selected' : ''}`}
                    onClick={() => setCheckInMode('WFO')}
                  >
                    Work From Office
                    <span className="mode-note">Use office facilities for the day.</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-option ${checkInMode === 'WFH' ? 'selected' : ''}`}
                    onClick={() => setCheckInMode('WFH')}
                  >
                    Work From Home
                    <span className="mode-note">Stay remote and work from home.</span>
                  </button>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setIsModeModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => {
                      if (checkInMode) {
                        handleCheckIn(checkInMode);
                        setIsModeModalOpen(false);
                      }
                    }}
                    disabled={!checkInMode || loading}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Events */}
        <div className="card events-card">
          <div className="events-head">
            <span className="events-title">📅 {MONTHS[calMonth]} Events</span>
            <span className="badge badge-muted">{currentMonthEvents.length}</span>
          </div>
          {currentMonthEvents.length === 0 ? (
            <div className="event-row" style={{ justifyContent: 'center', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              No events scheduled for this month.
            </div>
          ) : currentMonthEvents.map((e, i) => (
            <div key={e.id} className="event-row">
              <span className="event-date">{formatEventDate(e.date)}</span>
              <span className="event-label">{e.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      {summary && (
        <div className="dash-stats">
          {[
            { val: summary.wFO,      label: 'Check In Office', bg: '#7c3aed' },
            { val: summary.absent,   label: 'Absent',          bg: '#6d28d9' },
            { val: summary.wFH,      label: 'Check in Home',   bg: '#8b5cf6' },
            { val: summary.onLeave,  label: 'On Leave',        bg: '#a78bfa' },
            { val: summary.totalHours?.toFixed(1), label: 'Total Hrs', bg: '#5b21b6' },
            { val: summary.effectiveHours?.toFixed(1), label: 'Effective Hrs', bg: '#4c1d95' },
          ].map((s, i) => (
            <div key={i} className="stat-box" style={{ background: s.bg, border: 'none' }}>
              <div className="stat-box-val">{s.val}</div>
              <div className="stat-box-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar + Panel */}
      <div className="dash-bottom">
        <div className="card cal-card">
          <div className="cal-header">
            <button className="btn btn-ghost btn-sm" onClick={() => setCalMonth(m => Math.max(0,m-1))}>‹</button>
            <span className="cal-title">{MONTHS[calMonth]} {calYear}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCalMonth(m => Math.min(11,m+1))}>›</button>
          </div>
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-head">{d}</div>)}
            {cells.map((d, i) => {
              const rec = d ? recordMap[d] : null;
              const isToday = isThisMonth && d === todayDay;
              const isSel = d === selectedDay;
              const dow = d ? new Date(calYear, calMonth, d).getDay() : -1;
              const isWknd = dow === 0 || dow === 6;
              return (
                <div
                  key={i}
                  className={`cal-cell ${!d ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''} ${isWknd && d ? 'weekend' : ''}`}
                  onClick={() => d && setSelectedDay(d === selectedDay ? null : d)}
                >
                  {d && <>
                    <div className="cal-num">
                      {rec && <span className="cal-dot" style={{ background: rec.mode === 'WFO' ? 'var(--green)' : 'var(--accent)' }} />}
                      {d}
                    </div>
                    {rec && (
                      <div className={`cal-entry-chip ${rec.mode === 'WFO' ? 'wfo' : 'wfh'}`}>
                        {rec.checkIn}
                      </div>
                    )}
                  </>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="dash-right">
          <div className="card">
            <div className="sel-title">Selected Date</div>
            {selectedDay ? (
              selRec ? (
                <div className="sel-detail">
                  <div className="sel-date">{selectedDay} {MONTHS[calMonth]} {calYear}</div>
                  <div className="sel-rows">
                    {[['Check In', selRec.checkIn||'—'],['Check Out', selRec.checkOut||'—'],
                      ['Mode', selRec.mode],['Status', selRec.status],
                      ['Total Hrs', selRec.totalHours != null ? `${selRec.totalHours.toFixed(2)}h` : '—'],
                      ['Total Time', selRec.totalHours != null ? formatHoursDecimal(selRec.totalHours) : '—'],
                      ['Effective', selRec.effectiveHours != null ? `${selRec.effectiveHours.toFixed(2)}h` : '—']
                    ].map(([k,v]) => (
                      <div key={k} className="sel-row"><span>{k}</span><span>{v}</span></div>
                    ))}
                  </div>
                </div>
              ) : <div className="sel-empty">No record for {selectedDay} {MONTHS[calMonth]}</div>
            ) : (
              <div className="sel-empty">Click a date to view details</div>
            )}
          </div>

          <div className="card attendance-card">
            <div className="attendance-header">
              <div className="attendance-filter-tabs">
                {['WFO','WFH','Pending','Leave'].map(tab => (
                  <button
                    key={tab}
                    className={`filter-tab ${attendanceTab === tab ? 'active' : ''}`}
                    onClick={() => setAttendanceTab(tab)}
                  >
                    <span className="tab-text">{tab}</span>
                    <span className="tab-badge">{attendanceCount[tab]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="attendance-panel">
              {attendanceRows.length === 0 ? (
                <div className="panel-empty">No attendance records</div>
              ) : (
                <div className="panel-table">
                  <div className="table-header">
                    <div className="table-cell col-name">Employee</div>
                    <div className="table-cell col-status">Status</div>
                    <div className="table-cell col-time">Check In</div>
                    <div className="table-cell col-time">Check Out</div>
                  </div>
                  {attendanceRows.map((row, idx) => {
                    const isPending = attendanceTab === 'Pending';
                    const isLeave = attendanceTab === 'Leave';
                    const name = isPending ? row.name : row.employeeName;
                    const login = isPending ? '—' : row.checkIn || '—';
                    const logout = isPending ? '—' : row.checkOut || '—';
                    const statusValue = isPending ? 'Away' : isLeave ? 'Away' : (row.checkOut ? 'Busy' : 'Available');
                    const statusColor = statusValue === 'Available' ? '#10b981' : statusValue === 'Busy' ? '#ef4444' : '#8b5cf6';
                    return (
                      <div key={isPending ? row.id : row.id || idx} className="table-row">
                        <div className="table-cell col-name"><span className="emp-name">{name}</span></div>
                        <div className="table-cell col-status">
                          <div className="status-badge" style={{ borderLeftColor: statusColor }}>
                            <span className="status-dot" style={{ background: statusColor }} />
                            {statusValue}
                          </div>
                        </div>
                        <div className="table-cell col-time">{login}</div>
                        <div className="table-cell col-time">{logout}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="card legend-card">
            <div className="legend-title">Legend</div>
            <div className="legend-rows">
              <div className="legend-row"><span className="leg-dot" style={{background:'var(--green)'}}/>WFO - Office</div>
              <div className="legend-row"><span className="leg-dot" style={{background:'var(--accent)'}}/>WFH - Home</div>
              <div className="legend-row"><span className="leg-dot" style={{background:'var(--primary)'}}/>Today</div>
              <div className="legend-row"><span className="leg-dot" style={{background:'var(--text-muted)'}}/>Weekend</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
