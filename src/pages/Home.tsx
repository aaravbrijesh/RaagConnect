import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Music2, Calendar, Users, Sparkles, TrendingUp, Award } from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/integrations/supabase/client';

export default function Home() {
  const { isSignedIn, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    artists: 0,
    events: 0,
    members: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [artistsResult, eventsResult, profilesResult] = await Promise.all([
        supabase.from('artists').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        artists: artistsResult.count || 0,
        events: eventsResult.count || 0,
        members: profilesResult.count || 0,
      });
    };

    if (isSignedIn) {
      fetchStats();
    }
  }, [isSignedIn]);

  return (
    <div className="min-h-screen">
      <Nav />
      
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-16">
            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Where Classical Music Connects
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Discover maestros of Hindustani and Carnatic traditions, attend divine performances, and celebrate India's rich musical heritage
            </motion.p>
          </div>

          {isSignedIn ? (
            <>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  onClick={() => navigate('/artists')}
                  className="bg-gradient-to-br from-card to-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 text-left group"
                >
                  <div className="bg-primary/10 rounded-xl p-4 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <Music2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Discover Artists</h3>
                  <p className="text-muted-foreground">Connect with virtuosos of Indian classical music</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  onClick={() => navigate('/events')}
                  className="bg-gradient-to-br from-card to-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 text-left group"
                >
                  <div className="bg-primary/10 rounded-xl p-4 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Upcoming Concerts</h3>
                  <p className="text-muted-foreground">Experience the soul of classical music traditions</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-gradient-to-br from-card to-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 text-left group"
                >
                  <div className="bg-primary/10 rounded-xl p-4 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Join Community</h3>
                  <p className="text-muted-foreground">Connect with rasika and fellow devotees of classical music</p>
                </motion.button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 border border-primary/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">Welcome back, {user?.email?.split('@')[0]}!</h2>
                </div>
                <p className="text-muted-foreground mb-6">
                  Ready to explore? Discover maestros and attend soulful concerts.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 bg-card/50 rounded-lg p-4">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-xl">{stats.artists}</p>
                      <p className="text-sm text-muted-foreground">Artists</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-card/50 rounded-lg p-4">
                    <Calendar className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-xl">{stats.events}</p>
                      <p className="text-sm text-muted-foreground">Concerts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-card/50 rounded-lg p-4">
                    <Award className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-xl">{stats.members}</p>
                      <p className="text-sm text-muted-foreground">Members</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              className="text-center bg-card/50 backdrop-blur-sm rounded-2xl p-12 border border-border/50"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-lg text-muted-foreground mb-8">
                Sign in to discover maestros, attend concerts, and celebrate classical music
              </p>
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="rounded-full px-12 h-14 text-lg"
              >
                Get Started
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
