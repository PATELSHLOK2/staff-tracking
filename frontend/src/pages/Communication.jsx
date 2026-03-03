import { useEffect, useState } from 'react';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, submitFeedback, getFeedback } from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, X, Trash2, Megaphone, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Communication() {
    const { isManager } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [tab, setTab] = useState('announcements');
    const [showAnnModal, setShowAnnModal] = useState(false);
    const [showFbModal, setShowFbModal] = useState(false);
    const [annForm, setAnnForm] = useState({ title: '', message: '', priority: 'normal' });
    const [fbForm, setFbForm] = useState({ message: '', category: 'general', is_anonymous: false });
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const r1 = await getAnnouncements();
            setAnnouncements(r1.data || []);
            if (isManager) {
                const r2 = await getFeedback();
                setFeedbacks(r2.data || []);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleAnnouncement = async (e) => {
        e.preventDefault();
        if (!annForm.title || !annForm.message) { toast.error('Fill all fields'); return; }
        try {
            await createAnnouncement(annForm);
            toast.success('Announcement posted!');
            setShowAnnModal(false);
            setAnnForm({ title: '', message: '', priority: 'normal' });
            load();
        } catch { toast.error('Failed to post'); }
    };

    const handleDeleteAnn = async (id) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            await deleteAnnouncement(id);
            toast.success('Deleted');
            load();
        } catch { toast.error('Failed'); }
    };

    const handleFeedback = async (e) => {
        e.preventDefault();
        if (!fbForm.message) { toast.error('Enter a message'); return; }
        try {
            await submitFeedback(fbForm);
            toast.success('Feedback submitted! 🙏');
            setShowFbModal(false);
            setFbForm({ message: '', category: 'general', is_anonymous: false });
        } catch { toast.error('Failed to submit'); }
    };

    const catColors = { general: '#0ea5e9', complaint: '#ef4444', suggestion: '#22c55e' };

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>Communication</h1>
                    <p className="subtitle">Announcements & Staff Feedback</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {isManager && (
                        <button className="btn btn-primary" onClick={() => setShowAnnModal(true)}><Plus size={16} /> <Megaphone size={14} /> Post Announcement</button>
                    )}
                    <button className="btn btn-secondary" onClick={() => setShowFbModal(true)}><MessageSquare size={16} /> Send Feedback</button>
                </div>
            </div>

            <div className="page-container">
                {isManager && (
                    <div className="tabs">
                        <button className={`tab ${tab === 'announcements' ? 'active' : ''}`} onClick={() => setTab('announcements')}>
                            📢 Announcements ({announcements.length})
                        </button>
                        <button className={`tab ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>
                            💬 Feedback ({feedbacks.length})
                        </button>
                    </div>
                )}

                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <>
                        {(tab === 'announcements' || !isManager) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {announcements.length === 0 ? (
                                    <div className="empty-state"><div className="empty-state-icon">📢</div><h3>No announcements yet</h3></div>
                                ) : announcements.map(a => (
                                    <div key={a.id} className="card" style={{
                                        borderLeft: `4px solid ${a.priority === 'urgent' ? 'var(--danger)' : 'var(--primary)'}`,
                                        padding: '16px 20px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 700, fontSize: 16 }}>{a.title}</span>
                                                    {a.priority === 'urgent' && (
                                                        <span className="badge badge-danger" style={{ animation: 'pulse 2s ease infinite' }}>🚨 Urgent</span>
                                                    )}
                                                </div>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' }}>{a.message}</p>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    👤 {a.author_name} &nbsp;•&nbsp; 🕐 {new Date(a.created_at).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            {isManager && (
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAnn(a.id)}>
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {isManager && tab === 'feedback' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {feedbacks.length === 0 ? (
                                    <div className="empty-state"><div className="empty-state-icon">💬</div><h3>No feedback yet</h3></div>
                                ) : feedbacks.map(f => (
                                    <div key={f.id} className="card" style={{ padding: '14px 18px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <div className="avatar" style={{ fontSize: 12, flexShrink: 0 }}>
                                                {f.is_anonymous ? '?' : f.author_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <strong style={{ fontSize: 14 }}>{f.author_name}</strong>
                                                    <span className="badge" style={{ background: `${catColors[f.category]}20`, color: catColors[f.category], border: `1px solid ${catColors[f.category]}40` }}>
                                                        {f.category}
                                                    </span>
                                                    {f.is_anonymous && <span className="badge badge-muted">Anonymous</span>}
                                                </div>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 6px' }}>{f.message}</p>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(f.created_at).toLocaleString('en-IN')}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Announcement Modal */}
            {showAnnModal && (
                <div className="modal-overlay" onClick={() => setShowAnnModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">📢 Post Announcement</h2>
                            <button className="modal-close" onClick={() => setShowAnnModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleAnnouncement}>
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input className="form-input" value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })} placeholder="Announcement title" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Message *</label>
                                <textarea className="form-textarea" style={{ minHeight: 100 }} value={annForm.message} onChange={e => setAnnForm({ ...annForm, message: e.target.value })} placeholder="Write your announcement..." required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {['normal', 'urgent'].map(p => (
                                        <button key={p} type="button"
                                            className={`btn ${annForm.priority === p ? (p === 'urgent' ? 'btn-danger' : 'btn-primary') : 'btn-secondary'}`}
                                            style={{ flex: 1 }}
                                            onClick={() => setAnnForm({ ...annForm, priority: p })}>
                                            {p === 'urgent' ? '🚨 Urgent' : '📢 Normal'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAnnModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Post Announcement</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {showFbModal && (
                <div className="modal-overlay" onClick={() => setShowFbModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">💬 Submit Feedback</h2>
                            <button className="modal-close" onClick={() => setShowFbModal(false)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleFeedback}>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={fbForm.category} onChange={e => setFbForm({ ...fbForm, category: e.target.value })}>
                                    <option value="general">General</option>
                                    <option value="complaint">Complaint</option>
                                    <option value="suggestion">Suggestion</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Message *</label>
                                <textarea className="form-textarea" style={{ minHeight: 100 }} value={fbForm.message} onChange={e => setFbForm({ ...fbForm, message: e.target.value })} placeholder="Share your feedback, suggestions, or complaints..." required />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, cursor: 'pointer' }}
                                onClick={() => setFbForm({ ...fbForm, is_anonymous: !fbForm.is_anonymous })}>
                                <input type="checkbox" id="anon" checked={fbForm.is_anonymous} onChange={() => { }} style={{ cursor: 'pointer' }} />
                                <label htmlFor="anon" style={{ cursor: 'pointer', fontSize: 14 }}>Submit anonymously</label>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowFbModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Submit Feedback</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
