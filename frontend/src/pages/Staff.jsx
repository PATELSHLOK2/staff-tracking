import { useEffect, useState } from 'react';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../api';
import { Users, Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const SHIFTS = ['Morning', 'Evening', 'Night'];
const DEPTS = ['Fuel Dispensing', 'Cashier', 'Maintenance', 'Security', 'Management', 'General'];

const defaultForm = {
    name: '', username: '', password: '', role: 'staff',
    phone: '', email: '', shift: 'Morning', department: 'General', employee_id: '',
};

export default function Staff() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | 'create' | {edit: user}
    const [form, setForm] = useState(defaultForm);
    const [search, setSearch] = useState('');

    const load = () => {
        setLoading(true);
        getStaff().then(r => setStaff(r.data)).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setForm(defaultForm); setModal('create'); };
    const openEdit = (u) => { setForm({ ...u, password: '' }); setModal({ edit: u }); };
    const closeModal = () => setModal(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modal === 'create') {
                await createStaff(form);
                toast.success('Staff member added!');
            } else {
                const { password, ...rest } = form;
                await updateStaff(modal.edit.id, rest);
                toast.success('Staff updated!');
            }
            load();
            closeModal();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Error saving staff');
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Deactivate ${name}?`)) return;
        try {
            await deleteStaff(id);
            toast.success('Staff deactivated');
            load();
        } catch { toast.error('Error deactivating staff'); }
    };

    const filtered = staff.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
        s.department?.toLowerCase().includes(search.toLowerCase())
    );

    const shiftColors = { Morning: '#f59e0b', Evening: '#8b5cf6', Night: '#0ea5e9' };

    return (
        <div className="page-enter">
            <div className="page-header">
                <div>
                    <h1>Staff Management</h1>
                    <p className="subtitle">{staff.length} active members</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <input className="form-input" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Staff</button>
                </div>
            </div>

            <div className="page-container">
                {loading ? <div className="loading-overlay"><div className="loading-spinner" /></div> : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>ID</th>
                                    <th>Department</th>
                                    <th>Shift</th>
                                    <th>Contact</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div className="avatar" style={{ fontSize: 12 }}>
                                                    {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-muted">{s.employee_id || '—'}</span></td>
                                        <td>{s.department}</td>
                                        <td><span className="badge" style={{ background: `${shiftColors[s.shift]}20`, color: shiftColors[s.shift], border: `1px solid ${shiftColors[s.shift]}40` }}>{s.shift}</span></td>
                                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            <div>{s.phone}</div>
                                            <div>{s.email}</div>
                                        </td>
                                        <td><span className={`badge ${s.role === 'manager' ? 'badge-warning' : 'badge-info'}`}>{s.role}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.name)}><Trash2 size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{modal === 'create' ? 'Add New Staff' : 'Edit Staff'}</h2>
                            <button className="modal-close" onClick={closeModal}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Employee ID</label>
                                    <input className="form-input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Username *</label>
                                    <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={modal !== 'create'} />
                                </div>
                                {modal === 'create' && (
                                    <div className="form-group">
                                        <label className="form-label">Password *</label>
                                        <input className="form-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Shift</label>
                                    <select className="form-select" value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
                                        {SHIFTS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select className="form-select" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                                        {DEPTS.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        <option value="staff">Staff</option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    {modal === 'create' ? 'Add Staff' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
