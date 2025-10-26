import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function ArtistProfileCheck({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    checkArtistProfile();
  }, [user, location.pathname]);

  const checkArtistProfile = async () => {
    if (!user) {
      setIsChecking(false);
      return;
    }

    // Don't redirect if already on the create profile page
    if (location.pathname === '/create-artist-profile') {
      setIsChecking(false);
      return;
    }

    // Check if user has artist role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'artist');

    if (!roles || roles.length === 0) {
      setIsChecking(false);
      return;
    }

    // Check if they have an artist profile
    const { data: artistProfile } = await supabase
      .from('artists')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    // If they're an artist but don't have a profile, redirect to create one
    if (!artistProfile) {
      setNeedsProfile(true);
      navigate('/create-artist-profile');
    } else {
      setNeedsProfile(false);
    }
    
    setIsChecking(false);
  };

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Block rendering if artist needs profile and not on create page
  if (needsProfile && location.pathname !== '/create-artist-profile') {
    return null;
  }

  return <>{children}</>;
}

