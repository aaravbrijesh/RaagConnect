import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo.png';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

interface NavProps {
  selectedTab: string;
  onTabClick: (tab: string) => void;
}

export default function Nav({ selectedTab, onTabClick }: NavProps) {
  const { signOut, userRole } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/60 backdrop-blur-xl border-b border-border/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onTabClick('home')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img src={logo} alt="Music Connects" className="h-12 w-12" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              Music Connects
            </span>
          </motion.div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Button
              variant={selectedTab === 'home' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTabClick('home')}
              className="rounded-full"
            >
              Home
            </Button>

            <Button
              variant={selectedTab === 'artists' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTabClick('artists')}
              className="rounded-full"
            >
              Artists
            </Button>

            <Button
              variant={selectedTab === 'events' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTabClick('events')}
              className="rounded-full"
            >
              Events
            </Button>

            {userRole === 'admin' && (
              <Button
                variant={selectedTab === 'users' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onTabClick('users')}
                className="rounded-full"
              >
                Users
              </Button>
            )}

            <div className="ml-4 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Role: <span className="text-primary font-semibold">{userRole || 'viewer'}</span>
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                className="rounded-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
