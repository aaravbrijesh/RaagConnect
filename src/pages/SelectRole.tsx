import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Music, Eye, Calendar, Loader2 } from 'lucide-react';

export default function SelectRole() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'viewer' | 'artist' | 'organizer'>('viewer');
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (!user || !session) {
      navigate('/login');
      return;
    }

    // Check if user already has a role
    const checkExistingRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.role) {
        // User already has a role, redirect home
        navigate('/');
      }
      setCheckingRole(false);
    };

    checkExistingRole();
  }, [user, session, navigate]);

  const handleSelectRole = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Insert the role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role });

      if (error) throw error;

      toast.success('Role selected successfully!');
      
      if (role === 'artist') {
        navigate('/create-artist-profile');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Error setting role:', error);
      toast.error('Failed to set role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            Welcome to Raag Connect!
          </h2>
          <p className="text-center text-muted-foreground mb-6 text-sm">
            Choose how you'd like to use the platform
          </p>

          <div className="space-y-4">
            <RadioGroup value={role} onValueChange={(value) => setRole(value as 'viewer' | 'artist' | 'organizer')}>
              <div className="space-y-2">
                <div 
                  className={`cursor-pointer transition-all rounded-lg border ${role === 'viewer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setRole('viewer')}
                >
                  <div className="p-4 flex items-center gap-3">
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
                  <div className="p-4 flex items-center gap-3">
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
                  <div className="p-4 flex items-center gap-3">
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

            <Button 
              onClick={handleSelectRole} 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
