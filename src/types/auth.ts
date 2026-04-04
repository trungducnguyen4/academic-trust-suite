// Backend uses uppercase roles
export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN';

// Frontend display roles (for UI)
export type DisplayRole = 'student' | 'lecturer' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status?: 'active' | 'suspended' | 'pending' | 'deleted';
  avatar?: string;
  studentId?: string;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper to get display role
export function getDisplayRole(role: UserRole): DisplayRole {
  return role.toLowerCase() as DisplayRole;
}

// Helper to get backend role
export function getBackendRole(role: DisplayRole): UserRole {
  return role.toUpperCase() as UserRole;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
