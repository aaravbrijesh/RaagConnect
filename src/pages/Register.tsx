import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Music, Eye, Calendar } from 'lucide-react';

export default function Register() {
  const { registerUser, signInWithGoogle, authMessage, authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'viewer' | 'artist' | 'organizer'>('viewer');
  const navigate = useNavigate();

  useEffect(() => {
    if (authMessage) {
      if (authMessage.includes('successful')) {
        // Don't automatically navigate to login for artists
        if (role !== 'artist') {
          toast.success(authMessage);
          setTimeout(() => navigate('/login'), 2000);
        }
      } else {
        toast.error(authMessage);
      }
    }
  }, [authMessage, navigate, role]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await registerUser(email, password, role);
      if (role === 'artist') {
        // Don't navigate to login, go straight to profile creation
        navigate('/create-artist-profile');
      }
    } catch (err) {
      // Error handled by context
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      // Error handled by context
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
            className="text-3xl font-bold text-center mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Create Your Account
          </motion.h2>

          <motion.p
            className="text-center text-muted-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Join the classical music community
          </motion.p>

          <form onSubmit={handleRegister} className="space-y-4">
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
                placeholder="Password (6+ characters)"
                disabled={authLoading}
                className="bg-background/50 border-border/50"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
            >
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                disabled={authLoading}
                className="bg-background/50 border-border/50"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <Label>I am a...</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as 'viewer' | 'artist' | 'organizer')}>
                <Card className={`cursor-pointer transition-all ${role === 'viewer' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}`}>
                  <CardHeader className="p-4" onClick={() => setRole('viewer')}>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="viewer" id="viewer" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">Viewer</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                          Discover and book classical music events
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className={`cursor-pointer transition-all ${role === 'artist' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}`}>
                  <CardHeader className="p-4" onClick={() => setRole('artist')}>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="artist" id="artist" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">Artist</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                          Create your profile and showcase your music
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className={`cursor-pointer transition-all ${role === 'organizer' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}`}>
                  <CardHeader className="p-4" onClick={() => setRole('organizer')}>
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="organizer" id="organizer" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base">Organizer</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                          Create and manage classical music events
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </RadioGroup>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={authLoading}
              >
                {authLoading ? 'Creating account...' : 'Create Account'}
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
              onClick={handleGoogleSignUp}
              disabled={authLoading}
              className="w-full rounded-full"
            >
              Sign up with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-primary hover:underline font-semibold"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
