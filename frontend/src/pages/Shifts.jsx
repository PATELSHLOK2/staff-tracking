import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWeekShifts, getMyShifts, createShift, getStaff } from '../api';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const SHIFTS_CONFIG = {
    Morning: { start: '06:00', end: '14:00', color: '#f59e0b' },
    Evening: { start: '14:00', end: '22:00', color: '#8b5cf6' },
    Night: { start: '22:00', end: '06:00', color: '#0ea5e9' },
};

function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
}

function formatDate(d) {
    return d.toISOString().split('T')[0];
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export default function Shifts() {
    const { isManager } = useAuth();
    const [weekStart, setWeekStart] = useState(getWeekStart());
    const [shifts, setShifts] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(null); // { date, user_id? }
    const [form, setForm] = useState({ user_id: '', shift_name: 'Morning', is_off: false });

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekStartStr = formatDate(weekStart);

    const load = async () => {
        setLoading(true);
        try {
            if (isManager) {
                const [sr, wr] = await Promise.all([getStaff(), getWeekShifts(weekStartStr)]);
                setStaff(sr.data.filter(s => s.role === 'staff'));
                setShifts(wr.data || []);
            } else {
                const r = await getMyShifts();
                setShifts(r.data || []);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [weekStartStr]);

    const getShiftForUserDay = (userId, date) =>
        shifts.find(s => s.user_id === userId && s.date === formatDate(date));

    const handleSaveShift = async (e) => {
        e.preventDefault();
        if (!form.user_id && isManager) { toast.error('Select a staff member'); return; }
        const cfg = SHIFTS_CONFIG[form.shift_name];
        try {
            await createShift({
                user_id: parseInt(form.user_id),
                shift_name: form.is_off ? 'OFF' : form.shift_name,
                start_time: form.is_off ? '' : cfg.start,
                end_time: form.is_off ? '' : cfg.end,
                date: formatDate(showModal.date),
                is_off: form.is_off,
            });
            toast.success('Shift saved!');
            setShowModal(null);
            load();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save shift'); }
    };

    const prevWeek = () => setWeekStart(addDays(weekStart, -7));
    const nextWeek = () => setWeekStart(addDays(weekStart, 7));
    const isToday = (d) => formatDate(d) === formatDate(new Date());

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>{isManager ? 'Shift Scheduling' : 'My Schedule'}</h1>
                    <p className="subtitle">Week of {weekStart.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={prevWeek}><ChevronLeft size={16} /></button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setWeekStart(getWeekStart())}>Today</button>
                    <button className="btn btn-secondary btn-sm" onClick={nextWeek}><ChevronRight size={16} /></button>
                </div>
            </div>

            <div className="page-container">
                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                            {Object.entries(SHIFTS_CONFIG).map(([name, cfg]) => (
                                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    <span style={{ width: 12, height: 12, borderRadius: 3, background: cfg.color, display: 'inline-block' }} />
                                    {name} ({cfg.start}–{cfg.end})
                                </div>
                            ))}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg-elevated)', display: 'inline-block' }} />
                                Day Off
                            </div>
                        </div>

                        {isManager ? (
                            /* Manager Grid View */
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: 160 }}>Staff Member</th>
                                            {weekDays.map((d, i) => (
                                                <th key={i} style={{ textAlign: 'center', minWidth: 100, background: isToday(d) ? 'rgba(245,158,11,0.1)' : '' }}>
                                                    <div>{dayNames[i]}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.getDate()}/{d.getMonth() + 1}</div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staff.map(s => (
                                            <tr key={s.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div className="avatar" style={{ fontSize: 11, width: 30, height: 30 }}>
                                                            {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.department}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {weekDays.map((d, di) => {
                                                    const shift = getShiftForUserDay(s.id, d);
                                                    const cfg = shift && !shift.is_off ? SHIFTS_CONFIG[shift.shift_name] : null;
                                                    return (
                                                        <td key={di} style={{ textAlign: 'center', background: isToday(d) ? 'rgba(245,158,11,0.05)' : '' }}>
                                                            <div
                                                                onClick={() => { setForm({ user_id: s.id, shift_name: shift?.shift_name || s.shift, is_off: shift?.is_off || false }); setShowModal({ date: d }); }}
                                                                style={{
                                                                    cursor: 'pointer', borderRadius: 6, padding: '6px 4px', fontSize: 11,
                                                                    background: shift?.is_off ? 'var(--bg-elevated)' : cfg ? `${cfg.color}20` : 'transparent',
                                                                    color: shift?.is_off ? 'var(--text-muted)' : cfg ? cfg.color : 'var(--text-muted)',
                                                                    border: `1px solid ${shift?.is_off ? 'var(--border)' : cfg ? `${cfg.color}40` : 'var(--border)'}`,
                                                                    transition: 'all 0.2s',
                                                                    minHeight: 38,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                                                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                                            >
                                                                {shift?.is_off ? 'OFF' : shift ? shift.shift_name : <Plus size={12} />}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            /* Staff: Linear list view */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {weekDays.map((d, i) => {
                                    const shift = shifts.find(s => s.date === formatDate(d));
                                    const cfg = shift && !shift.is_off ? SHIFTS_CONFIG[shift.shift_name] : null;
                                    return (
                                        <div key={i} className="card" style={{
                                            borderLeft: `4px solid ${shift?.is_off ? 'var(--border)' : cfg ? cfg.color : 'var(--border)'}`,
                                            padding: '14px 18px',
                                            background: isToday(d) ? 'rgba(245,158,11,0.03)' : '',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700, fontSize: 15 }}>{dayNames[i]}, {d.getDate()}/{d.getMonth() + 1}</span>
                                                    {isToday(d) && <span className="badge badge-warning" style={{ fontSize: 10 }}>TODAY</span>}
                                                </div>
                                                {shift ? (
                                                    <div style={{ fontSize: 13, color: cfg ? cfg.color : 'var(--text-muted)', marginTop: 2 }}>
                                                        {shift.is_off ? '😴 Day Off' : `⛽ ${shift.shift_name} Shift (${shift.start_time} – ${shift.end_time})`}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Not scheduled</div>
                                                )}
                                            </div>
                                            {shift && !shift.is_off && cfg && (
                                                <div style={{ background: `${cfg.color}20`, color: cfg.color, padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1px solid ${cfg.color}40` }}>
                                                    {shift.start_time} – {shift.end_time}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {showModal && isManager && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Set Shift — {formatDate(showModal.date)}</h2>
                            <button className="modal-close" onClick={() => setShowModal(null)}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSaveShift}>
                            <div className="form-group">
                                <label className="form-label">Day Off?</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[false, true].map(v => (
                                        <button key={String(v)} type="button"
                                            className={`btn ${form.is_off === v ? 'btn-primary' : 'btn-secondary'}`}
                                            style={{ flex: 1 }}
                                            onClick={() => setForm({ ...form, is_off: v })}>
                                            {v ? '😴 Day Off' : '⛽ Working'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {!form.is_off && (
                                <div className="form-group">
                                    <label className="form-label">Shift</label>
                                    <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                                        {Object.entries(SHIFTS_CONFIG).map(([name, cfg]) => (
                                            <label key={name} style={{
                                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                                                borderRadius: 8, cursor: 'pointer',
                                                background: form.shift_name === name ? `${cfg.color}20` : 'var(--bg-surface)',
                                                border: `1px solid ${form.shift_name === name ? cfg.color : 'var(--border)'}`,
                                                transition: 'all 0.2s',
                                            }}>
                                                <input type="radio" name="shift" value={name} checked={form.shift_name === name} onChange={() => setForm({ ...form, shift_name: name })} />
                                                <span style={{ color: form.shift_name === name ? cfg.color : 'var(--text-secondary)', fontWeight: 600 }}>
                                                    {name} ({cfg.start}–{cfg.end})
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Shift</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
