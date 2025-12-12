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
  needsRoleSelection: boolean;
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
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);

  const fetchUserRole = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      return data?.role || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: Session | null, isInitial = false) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsSignedIn(true);
        
        // Fetch role after state is set
        const role = await fetchUserRole(session.user.id);
        if (!mounted) return;
        
        setUserRole(role);
        
        // Check if OAuth user needs role selection
        const provider = session.user.app_metadata?.provider;
        if (!role && (provider === 'google' || provider === 'oauth')) {
          setNeedsRoleSelection(true);
        } else {
          setNeedsRoleSelection(false);
        }
      } else {
        setIsSignedIn(false);
        setUserRole(null);
        setNeedsRoleSelection(false);
      }
      
      if (isInitial) {
        setAuthLoading(false);
      }
    };

    // Set up auth state listener FIRST - this catches OAuth redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle the session synchronously first
        setSession(session);
        setUser(session?.user ?? null);
        setIsSignedIn(!!session?.user);
        setAuthLoading(false);
        
        // Then fetch role asynchronously
        if (session?.user) {
          handleSession(session);
        } else {
          setUserRole(null);
          setNeedsRoleSelection(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      handleSession(session, true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    // No-op: users are already "guests" when unauthenticated
    // This function exists for backward compatibility
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
        needsRoleSelection,
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
