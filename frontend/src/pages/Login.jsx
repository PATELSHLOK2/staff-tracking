import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Fuel, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const { doLogin, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username || !form.password) {
            toast.error('Please fill in all fields');
            return;
        }
        const result = await doLogin(form.username, form.password);
        if (result.success) {
            toast.success('Welcome back! 🎉');
            navigate('/');
        } else {
            toast.error(result.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg-gradient" />
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon"><Fuel size={36} color="#000" /></div>
                    <h1>Gayatri Petroleum</h1>
                    <p>Petrol Pump Staff Management</p>
                </div>

                <div className="login-demo-creds">
                    <strong>Demo Credentials:</strong><br />
                    Manager: <strong>admin</strong> / <strong>admin123</strong><br />
                    Staff: <strong>staff1</strong> / <strong>staff123</strong>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Enter your username"
                            value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })}
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showPw ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                style={{ paddingRight: '44px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%',
                                    transform: 'translateY(-50%)', background: 'none',
                                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                                }}
                            >
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                        {loading ? <span className="animate-spin">⟳</span> : '⛽'} {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
                    © 2026 Gayatri Petroleum — Staff Management System
                </p>
            </div>
        </div>
    );
}
