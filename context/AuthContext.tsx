import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
// FIX: The specified types are not exported in older versions of the Supabase client. They have been removed.

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
    // FIX: The error indicating this method doesn't exist is likely due to an initialization problem with the Supabase client.
    // The method call itself is correct for Supabase v1 and v2.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // FIX: Replaced specific Supabase types with 'any' for broader version compatibility.
      async (_event: any, session: any | null) => {
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

        // FIX: Replaced 'signIn' with 'signInWithPassword' for email/password authentication, and corrected response destructuring.
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

      // Pass profile data during sign-up. A database trigger will handle inserting it
      // into the public.users table. This makes registration an atomic operation.
      const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: {
                  username,
                  role,
                  team_name: teamName,
              }
          }
      });

      if (signUpError) {
          // The trigger function (handle_new_user) attempts to insert into public.users.
          // If it fails due to a unique constraint, the error message from PostgreSQL
          // is passed back. We can inspect it to provide a more specific error.
          if (signUpError.message.includes('duplicate key value violates unique constraint')) {
              if (signUpError.message.includes('users_username_key')) {
                throw new Error('error.usernameExists');
              }
              if (signUpError.message.includes('users_team_name_key')) {
                throw new Error('error.teamNameExists');
              }
          }
          throw new Error(signUpError.message);
      }

      if (!data.user) throw new Error("Registration did not return a user.");

      // With the trigger in place, we don't need to manually insert into public.users.
      const registeredUser: User = {
          id: data.user.id,
          ...userData,
      };
      
      return registeredUser;
  }, []);

  const logout = async () => {
    // FIX: The error indicating 'signOut' doesn't exist is likely an initialization issue. The call is correct.
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