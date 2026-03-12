import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { authApi, setApiToken } from './api';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface User {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  role: string;
  verificationStatus?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    setApiToken(null);
    setToken(null);
    setUser(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Reset inactivity timer on user activity
  const resetTimer = useCallback(() => {
    if (!token) return; // only track when logged in
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      logout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [token, logout]);

  // Listen for user activity events
  useEffect(() => {
    if (!token) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    const handler = () => resetTimer();

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimer(); // start timer on login

    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [token, resetTimer]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const body = res.data;
    const tokenVal = body.data?.token || body.token;
    const userVal = body.data?.user || body.user;
    if (body.success && tokenVal) {
      setApiToken(tokenVal);
      setToken(tokenVal);
      setUser(userVal);
    } else {
      throw new Error(body.message || 'Login failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
