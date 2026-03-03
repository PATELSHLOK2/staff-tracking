import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, getTodayAttendance, getMyHistory, getAnnouncements, getMyTasks, getPendingLeaves } from '../api';
import { Users, ClipboardCheck, Clock, AlertTriangle, FileText, Bell, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function StatCard({ label, value, icon: Icon, color, bg }) {
    return (
        <div className="stat-card" style={{ '--accent-color': color, '--icon-bg': bg }}>
            <div className="stat-icon"><Icon size={22} /></div>
            <div className="stat-value">{value ?? '—'}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

export default function Dashboard() {
    const { user, isManager } = useAuth();
    const [stats, setStats] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [todayAtt, setTodayAtt] = useState(null);
    const [myHistory, setMyHistory] = useState([]);
    const [pendingLeaves, setPendingLeaves] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const promises = [getAnnouncements()];
        if (isManager) {
            promises.push(getDashboardStats(), getPendingLeaves());
        } else {
            promises.push(getTodayAttendance(), getMyTasks(), getMyHistory());
        }
        Promise.all(promises).then(results => {
            setAnnouncements(results[0].data || []);
            if (isManager) {
                setStats(results[1].data);
                setPendingLeaves(results[2].data || []);
            } else {
                setTodayAtt(results[1].data);
                setMyTasks(results[2].data || []);
                setMyHistory(results[3].data || []);
            }
        }).catch(console.error).finally(() => setLoading(false));
    }, [isManager]);

    if (loading) return <div className="loading-overlay"><div className="loading-spinner" /></div>;

    const attWeekData = myHistory.slice(0, 7).reverse().map(r => ({
        date: r.date?.slice(5),
        hours: r.check_in && r.check_out ? Math.round((new Date(r.check_out) - new Date(r.check_in)) / 36e5 * 10) / 10 : 0,
    }));

    const taskPieData = [
        { name: 'Completed', value: myTasks.filter(t => t.status === 'completed').length, color: '#22c55e' },
        { name: 'Pending', value: myTasks.filter(t => t.status === 'pending').length, color: '#f59e0b' },
        { name: 'In Progress', value: myTasks.filter(t => t.status === 'in_progress').length, color: '#0ea5e9' },
    ];

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>👋 Welcome, {user?.name?.split(' ')[0]}!</h1>
                    <p className="subtitle">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.3)', padding: '6px 14px' }}>
                    {isManager ? '👑 Manager' : `⛽ ${user?.shift} Shift`}
                </div>
            </div>

            <div className="page-container">
                {/* Manager Stats */}
                {isManager && stats && (
                    <div className="stats-grid">
                        <StatCard label="Total Staff" value={stats.total_staff} icon={Users} color="#0ea5e9" bg="rgba(14,165,233,0.1)" />
                        <StatCard label="Present Today" value={stats.present_today} icon={CheckCircle} color="#22c55e" bg="rgba(34,197,94,0.1)" />
                        <StatCard label="Checked In" value={stats.checked_in} icon={ClipboardCheck} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
                        <StatCard label="Absent Today" value={stats.absent_today} icon={XCircle} color="#ef4444" bg="rgba(239,68,68,0.1)" />
                        <StatCard label="Pending Leaves" value={stats.pending_leaves} icon={AlertTriangle} color="#8b5cf6" bg="rgba(139,92,246,0.1)" />
                        <StatCard label="Pending Tasks" value={stats.pending_tasks} icon={FileText} color="#06b6d4" bg="rgba(6,182,212,0.1)" />
                    </div>
                )}

                {/* Staff Today Status */}
                {!isManager && (
                    <div className="stats-grid mb-4">
                        <StatCard label="Today's Status" value={todayAtt?.status || 'Not Checked In'} icon={ClipboardCheck} color="#22c55e" bg="rgba(34,197,94,0.1)" />
                        <StatCard label="Check In" value={todayAtt?.check_in ? new Date(todayAtt.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} icon={Clock} color="#0ea5e9" bg="rgba(14,165,233,0.1)" />
                        <StatCard label="Check Out" value={todayAtt?.check_out ? new Date(todayAtt.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} icon={Clock} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
                        <StatCard label="My Tasks" value={myTasks.length} icon={FileText} color="#8b5cf6" bg="rgba(139,92,246,0.1)" />
                        <StatCard label="Leave Balance (Casual)" value={user?.casual_leave} icon={AlertTriangle} color="#22c55e" bg="rgba(34,197,94,0.1)" />
                    </div>
                )}

                <div className="grid-2 gap-4">
                    {/* Charts */}
                    {!isManager && (
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">📅 Weekly Attendance (Hours)</h3></div>
                            {attWeekData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={attWeekData}>
                                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9' }} />
                                        <Bar dataKey="hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="empty-state"><p>No attendance records yet</p></div>}
                        </div>
                    )}

                    {!isManager && myTasks.length > 0 && (
                        <div className="card">
                            <div className="card-header"><h3 className="card-title">📋 Task Overview</h3></div>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                                        {taskPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                                {taskPieData.map(d => (
                                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                        <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                                        {d.name}: {d.value}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending leave approvals for manager */}
                    {isManager && pendingLeaves.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🕐 Pending Leave Requests</h3>
                                <span className="badge badge-warning">{pendingLeaves.length}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {pendingLeaves.slice(0, 5).map(l => (
                                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-surface)', borderRadius: 8, gap: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>{l.user_name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.leave_type} • {l.start_date} to {l.end_date}</div>
                                        </div>
                                        <span className="badge badge-warning">Pending</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Announcements */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title"><Bell size={16} style={{ display: 'inline', marginRight: 6 }} />Announcements</h3>
                        </div>
                        {announcements.length === 0 ? (
                            <div className="empty-state"><p>No announcements yet</p></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {announcements.slice(0, 5).map(a => (
                                    <div key={a.id} style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 8, borderLeft: `3px solid ${a.priority === 'urgent' ? 'var(--danger)' : 'var(--primary)'}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</span>
                                            {a.priority === 'urgent' && <span className="badge badge-danger">Urgent</span>}
                                        </div>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{a.message}</p>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{a.author_name} • {new Date(a.created_at).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
