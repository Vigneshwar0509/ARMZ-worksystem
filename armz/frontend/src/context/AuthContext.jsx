import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('armz_user') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('armz_token') || null);

  const login = useCallback((userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('armz_user', JSON.stringify(userData));
    localStorage.setItem('armz_token', jwtToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('armz_user');
    localStorage.removeItem('armz_token');
  }, []);

  const isAdmin   = user?.role === 'Admin';
  const isManager = user?.role === 'Manager' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
