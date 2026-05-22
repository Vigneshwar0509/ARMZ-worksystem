import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV = [
  { to: '/dashboard',   icon: '◈', label: 'My Attendance', roles: ['Admin','Manager','Employee'] },
  { to: '/timeentry',   icon: '◷', label: 'Time Entry',    roles: ['Admin','Manager','Employee'] },
  { to: '/leave',       icon: '✦', label: 'My Leave',      roles: ['Admin','Manager','Employee'] },
  { to: '/team',        icon: '⊞', label: 'Team View',     roles: ['Admin','Manager'] },
  { to: '/employees',   icon: '◉', label: 'Employees',     roles: ['Admin'] },
  { to: '/events',      icon: '📅', label: 'Monthly Events',roles: ['Admin'] },
  { to: '/projects',    icon: '◆', label: 'Projects',      roles: ['Admin'] },
  { to: '/reports',     icon: '▤', label: 'Reports',       roles: ['Admin','Manager'] },
  { to: '/leave-admin', icon: '✔', label: 'Leave Approvals', roles: ['Admin','Manager'] },
];

export default function Sidebar({ className, onClose = () => {} }) {
  const { user, logout } = useAuth();

  const allowed = NAV.filter(n => n.roles.includes(user?.role));

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <aside className={`sidebar ${className || ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">✈</div>
        <div>
          <div className="logo-brand">ARMZ</div>
          <div className="logo-sub">AVIATION</div>
        </div>
        <button type="button" className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          ×
        </button>
      </div>

      <div className="sidebar-user">
        <div className="avatar">{initials}</div>
        <div className="user-info">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{user?.role} · {user?.employeeCode}</div>
        </div>
        <div className="online-dot" />
      </div>

      <nav className="sidebar-nav">
        {allowed.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-dept">{user?.department}</div>
        <button className="logout-btn" onClick={logout}>
          <span>⏻</span> Logout
        </button>
      </div>
    </aside>
  );
}
