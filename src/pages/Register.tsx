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
import { Music, Eye, Calendar, EyeOff } from 'lucide-react';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export default function Register() {
  const { registerUser, signInWithGoogle, authMessage, authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'viewer' | 'artist' | 'organizer'>('viewer');
  const navigate = useNavigate();

  useEffect(() => {
    if (authMessage) {
      if (authMessage.includes('check your email') || authMessage.includes('verify')) {
        toast.success(authMessage);
        // Navigate to verification pending page
        setTimeout(() => navigate('/verify-email'), 1500);
      } else if (authMessage.includes('successful')) {
        // For artists, go straight to profile creation after email verification
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
    
    const validation = registerSchema.safeParse({ 
      email: email.trim(), 
      password, 
      confirmPassword 
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    try {
      await registerUser(validation.data.email, validation.data.password, role);
      // Navigation is now handled by authMessage effect
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
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-xl p-8 shadow-lg border border-border">
          <h2 className="text-2xl font-semibold text-center mb-1">
            Create an account
          </h2>
          <p className="text-center text-muted-foreground mb-6 text-sm">
            Join the classical music community
          </p>

          <form onSubmit={handleRegister} className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              disabled={authLoading}
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (6+ characters)"
                disabled={authLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                disabled={authLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-sm">I am a...</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as 'viewer' | 'artist' | 'organizer')}>
                <div className="space-y-2">
                  <div 
                    className={`cursor-pointer transition-all rounded-lg border ${role === 'viewer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setRole('viewer')}
                  >
                    <div className="p-3 flex items-center gap-3">
                      <RadioGroupItem value="viewer" id="viewer" />
                      <div className="flex-1">
                        <label htmlFor="viewer" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          Viewer
                        </label>
                        <p className="text-xs text-muted-foreground">Discover and book events</p>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`cursor-pointer transition-all rounded-lg border ${role === 'artist' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setRole('artist')}
                  >
                    <div className="p-3 flex items-center gap-3">
                      <RadioGroupItem value="artist" id="artist" />
                      <div className="flex-1">
                        <label htmlFor="artist" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <Music className="h-4 w-4 text-muted-foreground" />
                          Artist
                        </label>
                        <p className="text-xs text-muted-foreground">Create your profile and showcase music</p>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`cursor-pointer transition-all rounded-lg border ${role === 'organizer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setRole('organizer')}
                  >
                    <div className="p-3 flex items-center gap-3">
                      <RadioGroupItem value="organizer" id="organizer" />
                      <div className="flex-1">
                        <label htmlFor="organizer" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Organizer
                        </label>
                        <p className="text-xs text-muted-foreground">Create and manage events</p>
                      </div>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-5 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignUp}
              disabled={authLoading}
              className="w-full"
            >
              Continue with Google
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
