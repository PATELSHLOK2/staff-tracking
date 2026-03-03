import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { applyLeave, getMyLeaves, getAllLeaves, getPendingLeaves, reviewLeave } from '../api';
import { Plus, X, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LEAVE_TYPES = ['casual', 'sick', 'paid', 'unpaid'];

function StatusBadge({ status }) {
    const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
    return <span className={`badge ${map[status]}`}>{status}</span>;
}

export default function Leave() {
    const { user, isManager } = useAuth();
    const [leaves, setLeaves] = useState([]);
    const [tab, setTab] = useState(isManager ? 'pending' : 'my');
    const [showModal, setShowModal] = useState(false);
    const [reviewModal, setReviewModal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
    const [reviewForm, setReviewForm] = useState({ status: 'approved', manager_note: '' });

    const load = async () => {
        setLoading(true);
        try {
            let r;
            if (isManager) {
                r = tab === 'pending' ? await getPendingLeaves() : await getAllLeaves();
            } else {
                r = await getMyLeaves();
            }
            setLeaves(r.data || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [tab]);

    const handleApply = async (e) => {
        e.preventDefault();
        if (!form.start_date || !form.end_date) { toast.error('Select dates'); return; }
        try {
            await applyLeave(form);
            toast.success('Leave application submitted!');
            setShowModal(false);
            load();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to apply'); }
    };

    const handleReview = async (e) => {
        e.preventDefault();
        try {
            await reviewLeave(reviewModal.id, reviewForm);
            toast.success(`Leave ${reviewForm.status}!`);
            setReviewModal(null);
            load();
        } catch (err) { toast.error('Failed to review'); }
    };

    const days = (l) => {
        if (!l.start_date || !l.end_date) return 0;
        return Math.round((new Date(l.end_date) - new Date(l.start_date)) / 86400000) + 1;
    };

    const typeColors = { casual: '#0ea5e9', sick: '#ef4444', paid: '#22c55e', unpaid: '#f59e0b' };

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>Leave Management</h1>
                    <p className="subtitle">{isManager ? 'Review and manage leave requests' : 'Apply and track your leaves'}</p>
                </div>
                {!isManager && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Apply for Leave</button>
                )}
            </div>

            <div className="page-container">
                {!isManager && (
                    <div className="stats-grid mb-4">
                        {[
                            { label: 'Casual Leave', value: user?.casual_leave, color: '#0ea5e9' },
                            { label: 'Sick Leave', value: user?.sick_leave, color: '#ef4444' },
                            { label: 'Paid Leave', value: user?.paid_leave, color: '#22c55e' },
                            { label: 'Unpaid Leave', value: user?.unpaid_leave, color: '#f59e0b' },
                        ].map(item => (
                            <div key={item.label} className="stat-card" style={{ '--accent-color': item.color, '--icon-bg': `${item.color}20` }}>
                                <div className="stat-value">{item.value ?? 0}</div>
                                <div className="stat-label">{item.label} Balance</div>
                            </div>
                        ))}
                    </div>
                )}

                {isManager && (
                    <div className="tabs">
                        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pending</button>
                        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Requests</button>
                    </div>
                )}

                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    {isManager && <th>Staff Name</th>}
                                    <th>Leave Type</th>
                                    <th>From</th>
                                    <th>To</th>
                                    <th>Days</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    {isManager && leaves.some(l => l.status === 'pending') && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {leaves.map(l => (
                                    <tr key={l.id}>
                                        {isManager && <td style={{ fontWeight: 600 }}>{l.user_name}</td>}
                                        <td>
                                            <span className="badge" style={{ background: `${typeColors[l.leave_type]}20`, color: typeColors[l.leave_type], border: `1px solid ${typeColors[l.leave_type]}40` }}>
                                                {l.leave_type}
                                            </span>
                                        </td>
                                        <td>{l.start_date}</td>
                                        <td>{l.end_date}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{days(l)}</td>
                                        <td style={{ maxWidth: 200, fontSize: 13, color: 'var(--text-muted)' }}>{l.reason || '—'}</td>
                                        <td>
                                            <StatusBadge status={l.status} />
                                            {l.manager_note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{l.manager_note}</div>}
                                        </td>
                                        {isManager && (
                                            <td>
                                                {l.status === 'pending' && (
                                                    <button className="btn btn-secondary btn-sm" onClick={() => { setReviewModal(l); setReviewForm({ status: 'approved', manager_note: '' }); }}>
                                                        Review
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {leaves.length === 0 && <div className="empty-state"><div className="empty-state-icon">📝</div><h3>No Leave Records</h3></div>}
                    </div>
                )}
            </div>

            {/* Apply Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Apply for Leave</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleApply}>
                            <div className="form-group">
                                <label className="form-label">Leave Type</label>
                                <select className="form-select" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Leave</option>)}
                                </select>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">From Date</label>
                                    <input className="form-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To Date</label>
                                    <input className="form-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason</label>
                                <textarea className="form-textarea" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave..." />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Application</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {reviewModal && (
                <div className="modal-overlay" onClick={() => setReviewModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Review Leave Request</h2>
                            <button className="modal-close" onClick={() => setReviewModal(null)}><X size={16} /></button>
                        </div>
                        <div className="alert alert-info" style={{ marginBottom: 16 }}>
                            <div><strong>{reviewModal.user_name}</strong> is requesting <strong>{reviewModal.leave_type}</strong> leave</div>
                            <div>{reviewModal.start_date} → {reviewModal.end_date} ({days(reviewModal)} days)</div>
                            {reviewModal.reason && <div style={{ marginTop: 4, fontStyle: 'italic' }}>{reviewModal.reason}</div>}
                        </div>
                        <form onSubmit={handleReview}>
                            <div className="form-group">
                                <label className="form-label">Decision</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button type="button" className={`btn ${reviewForm.status === 'approved' ? 'btn-success' : 'btn-secondary'}`} style={{ flex: 1 }}
                                        onClick={() => setReviewForm({ ...reviewForm, status: 'approved' })}>
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <button type="button" className={`btn ${reviewForm.status === 'rejected' ? 'btn-danger' : 'btn-secondary'}`} style={{ flex: 1 }}
                                        onClick={() => setReviewForm({ ...reviewForm, status: 'rejected' })}>
                                        <XCircle size={16} /> Reject
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Manager Note (optional)</label>
                                <textarea className="form-textarea" value={reviewForm.manager_note} onChange={e => setReviewForm({ ...reviewForm, manager_note: e.target.value })} placeholder="Add a note..." />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Confirm Decision</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
