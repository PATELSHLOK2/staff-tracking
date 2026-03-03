import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, ClipboardCheck, Calendar,
    MapPin, FileText, BarChart3, MessageSquare, LogOut,
    Fuel
} from 'lucide-react';

const managerNav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/staff', label: 'Staff Management', icon: Users },
    { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
    { to: '/shifts', label: 'Shift Schedule', icon: Calendar },
    { to: '/tracking', label: 'Worker Tracking', icon: MapPin },
    { to: '/tasks', label: 'Tasks', icon: FileText },
    { to: '/leaves', label: 'Leave Management', icon: Calendar },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/communication', label: 'Communication', icon: MessageSquare },
];

const staffNav = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: 'My Attendance', icon: ClipboardCheck },
    { to: '/shifts', label: 'My Shifts', icon: Calendar },
    { to: '/tasks', label: 'My Tasks', icon: FileText },
    { to: '/leaves', label: 'Leave Application', icon: Calendar },
    { to: '/communication', label: 'Communication', icon: MessageSquare },
];

export default function Sidebar() {
    const { user, doLogout, isManager } = useAuth();
    const navigate = useNavigate();
    const nav = isManager ? managerNav : staffNav;

    const handleLogout = () => {
        doLogout();
        navigate('/login');
    };

    const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon"><Fuel size={22} color="#000" /></div>
                <div className="logo-text">
                    <h2>Gayatri Petroleum</h2>
                    <p>Staff Management</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                <p className="nav-section-title">Menu</p>
                {nav.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={18} className="nav-icon" />
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-card" onClick={handleLogout} title="Logout">
                    <div className="avatar">{initials}</div>
                    <div className="user-card-info">
                        <div className="user-card-name">{user?.name}</div>
                        <div className="user-card-role">{user?.role === 'manager' ? '👑 Manager' : `⛽ ${user?.shift} Shift`}</div>
                    </div>
                    <LogOut size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
            </div>
        </aside>
    );
}
