import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ArtistProfileCheck from '@/components/ArtistProfileCheck';
import Home from './Home';

const Index = () => {
  const { isSignedIn, authLoading, continueAsGuest } = useAuth();

  useEffect(() => {
    // Check if we're coming back from an OAuth redirect
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isOAuthCallback = hashParams.has('access_token') || hashParams.has('error');
    
    // Only auto-signin as guest if not authenticated, no OAuth callback in progress
    if (!authLoading && !isSignedIn && !isOAuthCallback) {
      // Small delay to ensure any pending auth processes complete
      const timer = setTimeout(() => {
        continueAsGuest();
      }, 1000);
      return () => clearTimeout(timer);
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
