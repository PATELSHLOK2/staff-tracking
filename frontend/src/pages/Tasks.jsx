import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllTasks, getMyTasks, createTask, completeTask, updateTaskStatus, deleteTask, getStaff } from '../api';
import { Plus, X, CheckCircle, Trash2, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITIES = ['low', 'medium', 'high'];
const priorityColors = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };

function PriorityBadge({ priority }) {
    const color = priorityColors[priority] || '#64748b';
    return <span className="badge" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>{priority}</span>;
}

function StatusBadge({ status }) {
    const map = { pending: 'badge-warning', in_progress: 'badge-info', completed: 'badge-success' };
    return <span className={`badge ${map[status] || 'badge-muted'}`}>{status?.replace('_', ' ')}</span>;
}

export default function Tasks() {
    const { isManager } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [tab, setTab] = useState('all');
    const [form, setForm] = useState({ assigned_to: '', title: '', description: '', priority: 'medium', due_date: '' });

    const load = async () => {
        setLoading(true);
        try {
            const r = isManager ? await getAllTasks() : await getMyTasks();
            setTasks(r.data || []);
            if (isManager) {
                const sr = await getStaff();
                setStaff(sr.data.filter(s => s.role === 'staff'));
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.assigned_to || !form.title) { toast.error('Fill required fields'); return; }
        try {
            await createTask({ ...form, assigned_to: parseInt(form.assigned_to) });
            toast.success('Task assigned!');
            setShowModal(false);
            setForm({ assigned_to: '', title: '', description: '', priority: 'medium', due_date: '' });
            load();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create task'); }
    };

    const handleComplete = async (id) => {
        try {
            await completeTask(id);
            toast.success('Task marked complete! ✅');
            load();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await updateTaskStatus(id, { status });
            load();
        } catch (err) { toast.error('Failed to update'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this task?')) return;
        try {
            await deleteTask(id);
            toast.success('Task deleted');
            load();
        } catch { toast.error('Failed to delete'); }
    };

    const filtered = tab === 'all' ? tasks
        : tab === 'pending' ? tasks.filter(t => t.status === 'pending')
            : tab === 'completed' ? tasks.filter(t => t.status === 'completed')
                : tasks.filter(t => t.status === 'in_progress');

    const counts = {
        all: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
    };

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>Task Management</h1>
                    <p className="subtitle">{tasks.length} total tasks</p>
                </div>
                {isManager && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Assign Task</button>
                )}
            </div>

            <div className="page-container">
                {/* Quick stats */}
                <div className="stats-grid mb-4">
                    {[
                        { label: 'Total Tasks', value: counts.all, color: '#0ea5e9', icon: '📋' },
                        { label: 'Pending', value: counts.pending, color: '#f59e0b', icon: '⏳' },
                        { label: 'In Progress', value: counts.in_progress, color: '#8b5cf6', icon: '🔄' },
                        { label: 'Completed', value: counts.completed, color: '#22c55e', icon: '✅' },
                    ].map(s => (
                        <div key={s.label} className="stat-card" style={{ '--accent-color': s.color, '--icon-bg': `${s.color}20` }}>
                            <div style={{ fontSize: 28 }}>{s.icon}</div>
                            <div className="stat-value">{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="tabs">
                    {['all', 'pending', 'in_progress', 'completed'].map(t => (
                        <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                            {t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} {counts[t] > 0 && `(${counts[t]})`}
                        </button>
                    ))}
                </div>

                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.length === 0 ? (
                            <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No tasks in this category</h3></div>
                        ) : filtered.map(t => (
                            <div key={t.id} className="card" style={{ padding: '16px 20px', transition: 'all 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: 15, color: t.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title}</span>
                                            <PriorityBadge priority={t.priority} />
                                            <StatusBadge status={t.status} />
                                        </div>
                                        {t.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>{t.description}</p>}
                                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                            {isManager && <span>👤 {t.assigned_to_name}</span>}
                                            <span>📌 Assigned by {t.assigned_by_name}</span>
                                            {t.due_date && <span style={{ color: new Date(t.due_date) < new Date() && t.status !== 'completed' ? 'var(--danger)' : 'var(--text-muted)' }}>
                                                <AlertCircle size={11} style={{ display: 'inline' }} /> Due: {t.due_date}
                                            </span>}
                                            {t.completed_at && <span style={{ color: 'var(--success)' }}>✅ Done: {new Date(t.completed_at).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                                        {t.status === 'pending' && (
                                            <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(t.id, 'in_progress')}>
                                                <Clock size={13} /> Start
                                            </button>
                                        )}
                                        {t.status !== 'completed' && (
                                            <button className="btn btn-success btn-sm" onClick={() => handleComplete(t.id)}>
                                                <CheckCircle size={13} /> Done
                                            </button>
                                        )}
                                        {isManager && (
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Assign New Task</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Assign To *</label>
                                <select className="form-select" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} required>
                                    <option value="">Select staff member...</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.shift})</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Task Title *</label>
                                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter task title" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Task details..." />
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Assign Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
