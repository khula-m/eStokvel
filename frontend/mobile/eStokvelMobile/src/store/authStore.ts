import { create } from 'zustand';
import { User } from '../types';
import authService from '../services/auth.service';
import { getAuthToken, removeAuthToken } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (phoneNumber: string, password: string) => Promise<boolean>;
  register: (data: { phoneNumber: string; password: string; fullName: string; email?: string; idNumber?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (phoneNumber: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });
    
    const response = await authService.login({ phoneNumber, password });
    
    if (response.success && response.data?.user) {
      set({
        user: response.data.user,
        token: response.data.token || null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } else {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: response.message || 'Login failed',
      });
      return false;
    }
  },

  register: async (data): Promise<boolean> => {
    set({ isLoading: true, error: null });
    
    const response = await authService.register(data);
    
    if (response.success && response.data?.user) {
      set({
        user: response.data.user,
        token: response.data.token || null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } else {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: response.message || 'Registration failed',
      });
      return false;
    }
  },

  logout: async (): Promise<void> => {
    set({ isLoading: true });
    await authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  checkAuth: async (): Promise<void> => {
    set({ isLoading: true });
    
    const token = await getAuthToken();
    
    if (!token) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    const response = await authService.getCurrentUser();
    
    if (response.success && response.data) {
      set({
        user: response.data,
        token: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      await removeAuthToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: (): void => {
    set({ error: null });
  },
}));

export default useAuthStore;
