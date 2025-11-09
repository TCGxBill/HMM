import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { User } from '../types';
import * as apiService from '../services/apiService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, role: 'admin' | 'contestant') => Promise<User | null>;
  register: (userData: Omit<User, 'id'>) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = usePersistentState<User | null>('user', null);

  const login = useCallback(async (username: string, password: string, role: 'admin' | 'contestant'): Promise<User | null> => {
    try {
        const loggedInUser = await apiService.loginUser({ username, password, role });
        if (loggedInUser) {
            setUser(loggedInUser);
            return loggedInUser;
        }
        setUser(null);
        return null;
    } catch (error) {
        console.error("Login failed:", error);
        setUser(null);
        throw error;
    }
  }, [setUser]);

  const register = useCallback(async (userData: Omit<User, 'id'>): Promise<User> => {
    try {
        // Server now handles validation
        const newUser = await apiService.registerUser(userData);
        // Do not log in user automatically, force them to log in after registration
        return newUser;
    } catch (error) {
        console.error("Registration failed:", error);
        throw error;
    }
  }, []);

  const logout = () => {
    setUser(null);
    // Clear all localStorage to ensure a clean slate on next login
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('teams');
    window.localStorage.removeItem('tasks');
    window.localStorage.removeItem('contestStatus');
    window.localStorage.removeItem('masterKey');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
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
