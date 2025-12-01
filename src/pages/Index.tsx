import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ArtistProfileCheck from '@/components/ArtistProfileCheck';
import Home from './Home';

const Index = () => {
  const { isSignedIn, authLoading, continueAsGuest } = useAuth();

  // No auto-guest logic - users browse as unauthenticated by default
  // They only need to log in when attempting protected actions

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <ArtistProfileCheck>
      <Home />
    </ArtistProfileCheck>
  );
};

export default Index;
