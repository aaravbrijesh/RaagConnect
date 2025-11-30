import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  isSignedIn: boolean;
  authLoading: boolean;
  authMessage: string;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  registerUser: (email: string, password: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState('');

  const fetchUserRole = async (userId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'viewer';
      }
      
      return data?.role || 'viewer';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'viewer';
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsSignedIn(!!session?.user);

      if (session?.user) {
        // Defer role fetching to avoid blocking
        setTimeout(async () => {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
        }, 0);
      } else {
        setUserRole(null);
      }

      setAuthLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsSignedIn(!!session?.user);

      if (session?.user) {
        setTimeout(async () => {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
        }, 0);
      }

      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthMessage('Sign in successful!');
    } catch (error: any) {
      setAuthMessage(error.message || 'Failed to sign in');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    setAuthMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setAuthMessage(error.message || 'Failed to sign in with Google');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const registerUser = async (email: string, password: string, role: string = 'viewer') => {
    setAuthLoading(true);
    setAuthMessage('');
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            role: role
          }
        }
      });
      if (error) throw error;
      setAuthMessage('Registration successful! You can now log in.');
    } catch (error: any) {
      setAuthMessage(error.message || 'Failed to register');
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setUserRole(null);
      setIsSignedIn(false);
    } catch (error: any) {
      console.error('Sign out error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const continueAsGuest = () => {
    // Only allow guest mode if there's no existing session
    if (!session && !user) {
      setIsSignedIn(true);
      setUser(null);
      setSession(null);
      setUserRole('viewer');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        isSignedIn,
        authLoading,
        authMessage,
        signInWithEmail,
        signInWithGoogle,
        registerUser,
        signOut,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
