import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Music2, Calendar, Users, Sparkles, TrendingUp, Award } from 'lucide-react';
import Nav from '@/components/Nav';

export default function Home() {
  const { isSignedIn, user } = useAuth();
  const navigate = useNavigate();

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
              Where Music Connects
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Discover amazing artists, book unforgettable events, and be part of a vibrant music community
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
                  <p className="text-muted-foreground">Browse talented musicians from every genre</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  onClick={() => navigate('/events')}
                  className="bg-gradient-to-br from-card to-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 text-left group"
                >
                  <div className="bg-primary/10 rounded-xl p-4 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Upcoming Events</h3>
                  <p className="text-muted-foreground">Book tickets to amazing live performances</p>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-gradient-to-br from-card to-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-all duration-300 text-left group"
                >
                  <div className="bg-primary/10 rounded-xl p-4 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Join Community</h3>
                  <p className="text-muted-foreground">Connect with fellow music lovers</p>
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
                  Ready to explore? Check out our featured artists and upcoming events.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 bg-card/50 rounded-lg p-4">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-xl">50+</p>
                      <p className="text-sm text-muted-foreground">Artists</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-card/50 rounded-lg p-4">
                    <Calendar className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-xl">25+</p>
                      <p className="text-sm text-muted-foreground">Events</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-card/50 rounded-lg p-4">
                    <Award className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold text-xl">1000+</p>
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
                Sign in to explore artists, book events, and join our community
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
