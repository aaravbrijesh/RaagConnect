import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ArtistProfileCheck from '@/components/ArtistProfileCheck';
import Home from './Home';

const Index = () => {
  const { isSignedIn, authLoading, continueAsGuest } = useAuth();

  useEffect(() => {
    // Auto-signin as guest if not authenticated
    if (!authLoading && !isSignedIn) {
      continueAsGuest();
    }
  }, [isSignedIn, authLoading, continueAsGuest]);

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
