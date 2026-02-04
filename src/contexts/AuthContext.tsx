import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, AuthState } from '@/types/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: Record<string, User & { password: string }> = {
  'student@university.edu': {
    id: '1',
    email: 'student@university.edu',
    name: 'Alex Johnson',
    role: 'student',
    password: 'password123',
  },
  'lecturer@university.edu': {
    id: '2',
    email: 'lecturer@university.edu',
    name: 'Dr. Sarah Chen',
    role: 'lecturer',
    password: 'password123',
  },
  'admin@university.edu': {
    id: '3',
    email: 'admin@university.edu',
    name: 'System Admin',
    role: 'admin',
    password: 'password123',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const login = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const mockUser = mockUsers[email.toLowerCase()];
    
    if (mockUser && mockUser.password === password) {
      const { password: _, ...user } = mockUser;
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const resetPassword = async (email: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    if (!mockUsers[email.toLowerCase()]) {
      throw new Error('Email not found');
    }
    
    // In real implementation, send reset email
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, resetPassword }}>
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
