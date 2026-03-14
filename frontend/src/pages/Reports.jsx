import { useEffect, useState } from 'react';
import { getAttendanceSummary, getPerformanceReport, getLeaveSummary, exportAttendanceCsv } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';

const PERIODS = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
];

const COLORS = ['#f59e0b', '#0ea5e9', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || '#f59e0b', fontSize: 13, fontWeight: 600 }}>{p.name}: {p.value}</p>
            ))}
        </div>
    );
};

export default function Reports() {
    const [period, setPeriod] = useState('monthly');
    const [tab, setTab] = useState('attendance');
    const [attData, setAttData] = useState(null);
    const [perfData, setPerfData] = useState(null);
    const [leaveData, setLeaveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [r1, r2, r3] = await Promise.all([
                getAttendanceSummary(period),
                getPerformanceReport(period),
                getLeaveSummary(period),
            ]);
            setAttData(r1.data);
            setPerfData(r2.data);
            setLeaveData(r3.data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [period]);

    const handleExport = () => {
        const url = exportAttendanceCsv(period);
        const a = document.createElement('a');
        a.href = url;
        const token = localStorage.getItem('token');
        // Fetch with auth
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `attendance_${period}.csv`;
                link.click();
            });
    };

    const leaveTypeData = leaveData ? (() => {
        const counts = {};
        leaveData.data?.forEach(l => { counts[l.leave_type] = (counts[l.leave_type] || 0) + l.days; });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    })() : [];

    const leaveStatusData = leaveData ? (() => {
        const counts = { approved: 0, rejected: 0, pending: 0 };
        leaveData.data?.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    })() : [];

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>Reports & Analytics</h1>
                    <p className="subtitle">
                        {currentTime.toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                        })}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', padding: 4, borderRadius: 8 }}>
                        {PERIODS.map(p => (
                            <button key={p.value} onClick={() => setPeriod(p.value)}
                                className={`tab ${period === p.value ? 'active' : ''}`}
                                style={{ padding: '6px 14px', fontSize: 13 }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export CSV</button>
                </div>
            </div>

            <div className="page-container">
                <div className="tabs">
                    <button className={`tab ${tab === 'attendance' ? 'active' : ''}`} onClick={() => setTab('attendance')}>📋 Attendance</button>
                    <button className={`tab ${tab === 'performance' ? 'active' : ''}`} onClick={() => setTab('performance')}>📈 Performance</button>
                    <button className={`tab ${tab === 'leave' ? 'active' : ''}`} onClick={() => setTab('leave')}>📝 Leave</button>
                </div>

                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <>
                        {/* ATTENDANCE TAB */}
                        {tab === 'attendance' && attData && (
                            <>
                                <div className="stats-grid mb-4">
                                    {[
                                        { label: 'Total Staff Tracked', value: attData.data?.length, color: '#0ea5e9' },
                                        { label: 'Avg Attendance Days', value: attData.data?.length ? Math.round(attData.data.reduce((a, b) => a + b.present, 0) / attData.data.length) : 0, color: '#22c55e' },
                                        { label: 'Total Late Arrivals', value: attData.data?.reduce((a, b) => a + b.late, 0), color: '#f59e0b' },
                                        { label: 'Avg Hours/Person', value: attData.data?.length ? Math.round(attData.data.reduce((a, b) => a + b.total_hours, 0) / attData.data.length) : 0, color: '#8b5cf6' },
                                    ].map(s => (
                                        <div key={s.label} className="stat-card" style={{ '--accent-color': s.color, '--icon-bg': `${s.color}20` }}>
                                            <div className="stat-value">{s.value}</div>
                                            <div className="stat-label">{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid-2 gap-4 mb-4">
                                    <div className="card">
                                        <div className="card-header"><h3 className="card-title">Attendance by Staff</h3></div>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <BarChart data={attData.data?.slice(0, 8)} margin={{ left: -10 }}>
                                                <XAxis dataKey="user_name" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.split(' ')[0]} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="card">
                                        <div className="card-header"><h3 className="card-title">Hours Worked</h3></div>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <BarChart data={attData.data?.slice(0, 8)} margin={{ left: -10 }}>
                                                <XAxis dataKey="user_name" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.split(' ')[0]} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="total_hours" name="Hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Staff Name</th>
                                                <th>Department</th>
                                                <th>Shift</th>
                                                <th>Present Days</th>
                                                <th>Absent</th>
                                                <th>Late</th>
                                                <th>Total Hours</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attData.data?.map((s, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{s.user_name}</td>
                                                    <td>{s.department}</td>
                                                    <td>{s.shift}</td>
                                                    <td><span style={{ color: 'var(--success)', fontWeight: 600 }}>{s.present}</span></td>
                                                    <td><span style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.absent}</span></td>
                                                    <td><span style={{ color: 'var(--warning)', fontWeight: 600 }}>{s.late}</span></td>
                                                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{s.total_hours}h</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {/* PERFORMANCE TAB */}
                        {tab === 'performance' && perfData && (
                            <>
                                <div className="grid-2 gap-4 mb-4">
                                    <div className="card">
                                        <div className="card-header"><h3 className="card-title">Task Completion Rate (%)</h3></div>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <BarChart data={perfData.data?.slice(0, 8)} margin={{ left: -10 }}>
                                                <XAxis dataKey="user_name" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.split(' ')[0]} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="completion_rate" name="Completion %" radius={[4, 4, 0, 0]}>
                                                    {perfData.data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="card">
                                        <div className="card-header"><h3 className="card-title">On-Time Rate (%)</h3></div>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <BarChart data={perfData.data?.slice(0, 8)} margin={{ left: -10 }}>
                                                <XAxis dataKey="user_name" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.split(' ')[0]} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="on_time_rate" name="On-Time %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Staff Name</th>
                                                <th>Shift</th>
                                                <th>Attendance Days</th>
                                                <th>Hours</th>
                                                <th>Tasks Assigned</th>
                                                <th>Tasks Done</th>
                                                <th>Completion</th>
                                                <th>On-Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {perfData.data?.map((s, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{s.user_name}</td>
                                                    <td>{s.shift}</td>
                                                    <td>{s.attendance_days}</td>
                                                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{s.total_hours}h</td>
                                                    <td>{s.tasks_assigned}</td>
                                                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{s.tasks_completed}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 4, height: 6 }}>
                                                                <div style={{ width: `${s.completion_rate}%`, background: s.completion_rate > 70 ? '#22c55e' : s.completion_rate > 40 ? '#f59e0b' : '#ef4444', height: '100%', borderRadius: 4 }} />
                                                            </div>
                                                            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 35, color: s.completion_rate > 70 ? '#22c55e' : s.completion_rate > 40 ? '#f59e0b' : '#ef4444' }}>{s.completion_rate}%</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ color: s.on_time_rate > 80 ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>{s.on_time_rate}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {/* LEAVE TAB */}
                        {tab === 'leave' && leaveData && (
                            <>
                                <div className="grid-2 gap-4 mb-4">
                                    <div className="card">
                                        <div className="card-header"><h3 className="card-title">Leave by Type (Days)</h3></div>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <PieChart>
                                                <Pie data={leaveTypeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}d`}>
                                                    {leaveTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="card">
                                        <div className="card-header"><h3 className="card-title">Leave Status</h3></div>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <PieChart>
                                                <Pie data={leaveStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                                    {leaveStatusData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.name === 'approved' ? '#22c55e' : entry.name === 'rejected' ? '#ef4444' : '#f59e0b'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Staff Name</th>
                                                <th>Leave Type</th>
                                                <th>Days</th>
                                                <th>From</th>
                                                <th>To</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaveData.data?.map((l, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{l.user_name}</td>
                                                    <td style={{ textTransform: 'capitalize' }}>{l.leave_type}</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{l.days}</td>
                                                    <td>{l.start_date}</td>
                                                    <td>{l.end_date}</td>
                                                    <td>
                                                        <span className={`badge ${l.status === 'approved' ? 'badge-success' : l.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{l.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {!leaveData.data?.length && (
                                                <tr><td colSpan={6}><div className="empty-state" style={{ padding: '20px' }}>No leave records found</div></td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
