import React, { createContext, useContext, ReactNode } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers: { [username: string]: User } = {
  'admin': { username: 'admin', role: 'admin', teamId: null },
  'contestant1': { username: 'contestant1', role: 'contestant', teamId: 1 },
  'contestant2': { username: 'contestant2', role: 'contestant', teamId: 2 },
  'contestant3': { username: 'contestant3', role: 'contestant', teamId: 3 },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = usePersistentState<User | null>('user', null);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Mock authentication logic
    if (password === 'password123' && mockUsers[username]) {
      setUser(mockUsers[username]);
      return true;
    }
    setUser(null);
    return false;
  };

  const logout = () => {
    setUser(null);
    // Optional: Clear entire contest state on logout for a clean slate
    // window.localStorage.removeItem('teams');
    // window.localStorage.removeItem('contestState');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};