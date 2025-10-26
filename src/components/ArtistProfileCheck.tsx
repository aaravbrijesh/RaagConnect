import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';

export default function ArtistProfileCheck({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isArtist, setIsArtist] = useState(false);

  useEffect(() => {
    checkArtistProfile();
  }, [user]);

  const checkArtistProfile = async () => {
    if (!user) return;

    // Check if user has artist role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'artist');

    if (!roles || roles.length === 0) {
      setIsArtist(false);
      return;
    }

    setIsArtist(true);

    // Check if they have an artist profile
    const { data: artistProfile } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // If they're an artist but don't have a profile, show prompt
    if (!artistProfile) {
      setShowPrompt(true);
    }
  };

  const handleCreateProfile = () => {
    setShowPrompt(false);
    navigate('/artists?create=true');
  };

  const handleLater = () => {
    setShowPrompt(false);
  };

  return (
    <>
      {children}
      
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="h-8 w-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Create Your Artist Profile</DialogTitle>
            <DialogDescription className="text-center text-base">
              You're registered as an artist! Create your public profile to showcase your music and connect with audiences.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handleCreateProfile} 
              className="w-full"
              size="lg"
            >
              Create Profile Now
            </Button>
            <Button 
              onClick={handleLater} 
              variant="ghost"
              className="w-full"
            >
              I'll do this later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
