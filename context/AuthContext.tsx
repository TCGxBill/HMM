import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string, role: 'admin' | 'contestant') => Promise<User | null>;
  register: (userData: Omit<User, 'id'>) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching user profile:', error);
            setUser(null);
          } else if (userProfile) {
            setUser({
              id: userProfile.id,
              username: userProfile.username,
              email: userProfile.email,
              role: userProfile.role,
              teamName: userProfile.team_name,
            });
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (username: string, password: string, role: 'admin' | 'contestant'): Promise<User | null> => {
    try {
        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('email')
            .eq('username', username)
            .eq('role', role)
            .single();

        if (profileError || !userProfile) {
            console.error("User not found for login:", profileError);
            throw new Error("Invalid username or password.");
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: userProfile.email,
            password,
        });

        if (error) throw error;
        if (!data.user) return null;

        const { data: loggedInProfile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
        
        if (!loggedInProfile) return null;

        const finalUser = {
            id: loggedInProfile.id,
            username: loggedInProfile.username,
            email: loggedInProfile.email,
            role: loggedInProfile.role,
            teamName: loggedInProfile.team_name,
        };
        setUser(finalUser);
        return finalUser;

    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
  }, []);

  const register = useCallback(async (userData: Omit<User, 'id'>): Promise<User> => {
      const { email, password, username, role, teamName } = userData;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) throw new Error(signUpError.message);
      if (!authData.user) throw new Error("Registration did not return a user.");

      const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          username,
          email,
          role,
          team_name: teamName,
      });
      
      if (profileError) {
          console.error("Failed to create user profile after sign up:", profileError);
          // Ideally, we'd delete the auth.users entry here, but that requires admin rights.
          // The user will have an auth entry but no profile and won't be able to log in.
          throw new Error("Could not create user profile. Username or team name might be taken.");
      }

      const registeredUser: User = {
          id: authData.user.id,
          ...userData,
      };
      return registeredUser;
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAuthenticated = !!user;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-contest-dark text-white font-sans">
        <div className="flex items-center space-x-3 text-lg">
          <div className="w-6 h-6 border-4 border-contest-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Authenticating...</span>
        </div>
      </div>
    );
  }

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
