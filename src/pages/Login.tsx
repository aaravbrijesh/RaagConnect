import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const { signInWithEmail, signInWithGoogle, authMessage, authLoading, isSignedIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, navigate]);

  useEffect(() => {
    if (authMessage) {
      if (authMessage.includes('successful')) {
        toast.success(authMessage);
      } else {
        toast.error(authMessage);
      }
    }
  }, [authMessage]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      // Error handled by context
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      // Error handled by context
    }
  };

  const handleTestLogin = async (email: string, password: string, role: string) => {
    try {
      // First try to login
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (loginError) {
        // If login fails, register the user
        toast.info(`Creating test ${role} account...`);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { role }
          }
        });
        
        if (signUpError) throw signUpError;
        
        // Wait a bit for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Now login with the new account
        const { error: loginError2 } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError2) throw loginError2;
        
        toast.success(`Logged in as test ${role}!`);
        
        // Redirect artists to profile creation
        if (role === 'artist') {
          setTimeout(() => navigate('/create-artist-profile'), 500);
        }
      } else {
        toast.success(`Logged in as test ${role}!`);
        
        // Check if artist needs profile
        if (role === 'artist') {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            const { data: profile } = await supabase
              .from('artists')
              .select('id')
              .eq('user_id', data.user.id)
              .maybeSingle();
            
            if (!profile) {
              setTimeout(() => navigate('/create-artist-profile'), 500);
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to login as ${role}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-8 shadow-elegant border border-border/50">
          <motion.h2
            className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            🎵 Music Connects
          </motion.h2>

          <motion.p
            className="text-center text-muted-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Sign in to discover classical music
          </motion.p>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                disabled={authLoading}
                className="bg-background/50 border-border/50"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={authLoading}
                className="bg-background/50 border-border/50"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={authLoading}
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </motion.div>
          </form>

          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Test Accounts (Dev Only)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTestLogin('viewer@test.com', 'viewer123', 'viewer')}
                disabled={authLoading}
                className="text-xs"
              >
                👁️ Viewer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTestLogin('artist@test.com', 'artist123', 'artist')}
                disabled={authLoading}
                className="text-xs"
              >
                🎵 Artist
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTestLogin('organizer@test.com', 'organizer123', 'organizer')}
                disabled={authLoading}
                className="text-xs"
              >
                📅 Organizer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTestLogin('admin@test.com', 'admin123', 'admin')}
                disabled={authLoading}
                className="text-xs"
              >
                👑 Admin
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={authLoading}
              className="w-full rounded-full"
            >
              Sign in with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-primary hover:underline font-semibold"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
