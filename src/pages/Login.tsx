import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long')
});

export default function Login() {
  const { signInWithEmail, signInWithGoogle, continueAsGuest, authMessage, authLoading, isSignedIn } = useAuth();
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
    
    const validation = loginSchema.safeParse({ email: email.trim(), password });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }
    
    try {
      await signInWithEmail(validation.data.email, validation.data.password);
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

  const handleGuestContinue = () => {
    continueAsGuest();
    navigate('/');
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
            🎵 Raag Connects
          </motion.h2>

          <motion.p
            className="text-center text-muted-foreground mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Sign in to discover classical music
          </motion.p>

          <motion.div
            className="bg-muted/50 rounded-lg p-4 mb-6 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <p className="font-semibold mb-2 text-foreground">Test Accounts:</p>
            <div className="space-y-1 text-muted-foreground">
              <p><strong>Admin:</strong> admin@test.com</p>
              <p><strong>Organizer:</strong> organizer@test.com</p>
              <p><strong>Artist:</strong> artist@test.com</p>
              <p><strong>Viewer:</strong> viewer@test.com</p>
              <p className="mt-2 text-xs">Password: password123</p>
            </div>
          </motion.div>

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

            <Button
              type="button"
              variant="ghost"
              onClick={handleGuestContinue}
              disabled={authLoading}
              className="w-full rounded-full"
            >
              Continue as Guest
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
