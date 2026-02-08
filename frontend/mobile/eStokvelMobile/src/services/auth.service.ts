import api, { setAuthToken, removeAuthToken } from './api';
import { LoginCredentials, RegisterData, AuthResponse, User, ApiResponse } from '../types';

// Auth Service - SRS 6.4.6 JWT Authentication
export const authService = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', credentials);
      
      if (response.data.success && response.data.data?.token) {
        await setAuthToken(response.data.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.',
      };
    }
  },

  // Register new user
  register: async (data: RegisterData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', data);
      
      if (response.data.success && response.data.data?.token) {
        await setAuthToken(response.data.data.token);
      }
      
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed. Please try again.',
      };
    }
  },

  // Get current user profile
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    try {
      const response = await api.get<ApiResponse<User>>('/api/users/me');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get user profile.',
      };
    }
  },

  // Logout user
  logout: async (): Promise<void> => {
    await removeAuthToken();
  },

  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const response = await api.get('/api/users/me');
      return response.data.success === true;
    } catch {
      return false;
    }
  },
};

export default authService;
