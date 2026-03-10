// ============================================================
// FILE: src/context/AuthContext.jsx
// JWT auth state — login / logout / register / isAdmin / isManager / isStaff
// ============================================================
import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sa_user')); }
        catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('sa_token'));

    // ── Đăng nhập ────────────────────────────────────────────
    const login = useCallback(async (username, password) => {
        const res = await authApi.login({ username, password });
        const { token: t, ...userInfo } = res.data;
        localStorage.setItem('sa_token', t);
        localStorage.setItem('sa_user', JSON.stringify(userInfo));
        setToken(t);
        setUser(userInfo);
        return userInfo;
    }, []);

    // ── Đăng xuất (gọi API + xóa local) ────────────────────
    const logout = useCallback(async () => {
        try { await authApi.logout(); } catch { /* ignore if token expired */ }
        localStorage.removeItem('sa_token');
        localStorage.removeItem('sa_user');
        setToken(null);
        setUser(null);
    }, []);

    // ── Đăng ký tài khoản mới ───────────────────────────────
    const register = useCallback(async (data) => {
        const res = await authApi.register(data);
        return res.data;
    }, []);

    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Admin' || user?.role === 'Manager';
    const isStaff = !!user;

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, isAdmin, isManager, isStaff }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
