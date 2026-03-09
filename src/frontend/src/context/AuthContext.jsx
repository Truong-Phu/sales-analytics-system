// ============================================================
// FILE: src/context/AuthContext.jsx
// ĐÃ SỬA: destructure camelCase sau khi backend dùng JsonNamingPolicy.CamelCase
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

  const login = useCallback(async (username, password) => {
    const res = await authApi.login({ username, password });
    const data = res.data;

    // Backend trả về camelCase (sau khi fix Program.cs):
    // { token, userId, username, fullName, role, expiresAt }
    const t = data.token;
    if (!t) throw new Error('Không nhận được token từ server');

    const userInfo = {
      userId:   data.userId,
      username: data.username,
      fullName: data.fullName,
      role:     data.role,
      expiresAt: data.expiresAt,
    };

    localStorage.setItem('sa_token', t);
    localStorage.setItem('sa_user', JSON.stringify(userInfo));
    setToken(t);
    setUser(userInfo);
    return userInfo;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin   = user?.role === 'Admin';
  const isManager = user?.role === 'Admin' || user?.role === 'Manager';
  const isStaff   = !!user;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isManager, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
