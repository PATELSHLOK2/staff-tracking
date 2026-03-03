import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getMe } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('user')); }
        catch { return null; }
    });
    const [loading, setLoading] = useState(false);

    const doLogin = async (username, password) => {
        setLoading(true);
        try {
            const res = await apiLogin({ username, password });
            const { access_token, user: userData } = res.data;
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.response?.data?.detail || 'Login failed' };
        } finally {
            setLoading(false);
        }
    };

    const doLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const res = await getMe();
            const updated = res.data;
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(updated));
        } catch { }
    };

    return (
        <AuthContext.Provider value={{ user, loading, doLogin, doLogout, refreshUser, isManager: user?.role === 'manager' }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
