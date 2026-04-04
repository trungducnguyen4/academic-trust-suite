import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState } from '@/types/auth';
import api from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  applyProfileToSession: (user: User) => void;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    studentId?: string;
    department?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start with loading to check token
  });

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const user = await api.getMe();
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token invalid, clear it
          api.clearToken();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const response = await api.login(email, password);
      api.setToken(response.accessToken);
      
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw new Error(error.message || 'Invalid credentials');
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    studentId?: string;
    department?: string;
  }) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    
    try {
      const response = await api.register(data);
      api.setToken(response.accessToken);
      
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = () => {
    api.clearToken();
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshProfile = async () => {
    const refreshedUser = await api.getMe();
    setAuthState((prev) => ({
      ...prev,
      user: refreshedUser,
      isAuthenticated: true,
      isLoading: false,
    }));
  };

  const applyProfileToSession = (user: User) => {
    setAuthState((prev) => ({
      ...prev,
      user,
      isAuthenticated: true,
      isLoading: false,
    }));
  };

  const resetPassword = async (email: string) => {
    // In real implementation, call API to send reset email
    // For now, just simulate the call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // TODO: Implement password reset API endpoint on backend
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, resetPassword, register, refreshProfile, applyProfileToSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
