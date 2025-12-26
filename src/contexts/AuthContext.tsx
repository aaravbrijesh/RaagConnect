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

        const role = await fetchUserRole(session.user.id);
        if (!mounted) return;

        setUserRole(role);

        const provider = session.user.app_metadata?.provider;
        setNeedsRoleSelection(!role && (provider === 'google' || provider === 'oauth'));
      } else {
        setIsSignedIn(false);
        setUserRole(null);
        setNeedsRoleSelection(false);
      }

      if (isInitial) {
        setAuthLoading(false);
      }
    };

    // Set up auth state listener FIRST - catches OAuth redirects
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // Synchronous state updates only
      setSession(session);
      setUser(session?.user ?? null);
      setIsSignedIn(!!session?.user);
      setAuthLoading(false);

      // Defer backend calls to avoid auth callback deadlocks
      setTimeout(() => {
        if (!mounted) return;
        if (session?.user) {
          handleSession(session);
        } else {
          setUserRole(null);
          setNeedsRoleSelection(false);
        }
      }, 0);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Handle email not confirmed error
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          localStorage.setItem('pendingVerificationEmail', email);
          setAuthMessage('Please verify your email before signing in. Check your inbox for the verification link.');
          throw error;
        }
        throw error;
      }
      
      // Clear pending email on successful login
      localStorage.removeItem('pendingVerificationEmail');
      setAuthMessage('Sign in successful!');
    } catch (error: any) {
      if (!error.message?.toLowerCase().includes('email not confirmed')) {
        setAuthMessage(error.message || 'Failed to sign in');
      }
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
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            role: role
          }
        }
      });
      if (error) throw error;
      
      // Store email for potential resend
      localStorage.setItem('pendingVerificationEmail', email);
      
      // Check if user already exists (identities will be empty)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setAuthMessage('An account with this email already exists. Please sign in instead.');
        throw new Error('User already exists');
      }
      
      setAuthMessage('Please check your email to verify your account before logging in.');
    } catch (error: any) {
      if (error.message !== 'User already exists') {
        setAuthMessage(error.message || 'Failed to register');
      }
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
