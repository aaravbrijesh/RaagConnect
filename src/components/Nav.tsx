import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, NavLink } from 'react-router-dom';
import { Music2, Home, Users, Calendar, LogOut } from 'lucide-react';
import logo from '@/assets/MusicConnectsLogo.png';

export default function Nav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
    }`;

  return (
    <nav className="border-b border-border/50 backdrop-blur-sm bg-background/95 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="Music Connects" className="h-10 w-10" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Sangeet Samagam
              </span>
            </button>

            {user && (
              <div className="hidden md:flex items-center gap-2">
                <NavLink to="/" end className={navLinkClass}>
                  <Home className="h-4 w-4" />
                  Home
                </NavLink>
                <NavLink to="/artists" className={navLinkClass}>
                  <Users className="h-4 w-4" />
                  Artists
                </NavLink>
                <NavLink to="/events" className={navLinkClass}>
                  <Calendar className="h-4 w-4" />
                  Concerts
                </NavLink>
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
