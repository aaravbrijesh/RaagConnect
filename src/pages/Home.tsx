import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Music2, Calendar, Users } from 'lucide-react';

export default function Home() {
  const { isSignedIn, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-12">
          <motion.h1
            className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            🎶 Welcome to Music Connects
          </motion.h1>
          <motion.p
            className="text-xl text-muted-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Celebrate music and the artists who create it
          </motion.p>
        </div>

        <motion.div
          className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 shadow-elegant border border-border/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          {isSignedIn ? (
            <div className="space-y-6">
              <p className="text-center text-lg">
                Welcome back, <span className="text-primary font-semibold">{user?.email}</span>!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-secondary/50 rounded-xl p-6 text-center space-y-2"
                >
                  <Music2 className="w-12 h-12 mx-auto text-primary" />
                  <h3 className="font-semibold">Discover Artists</h3>
                  <p className="text-sm text-muted-foreground">Explore talented musicians</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-secondary/50 rounded-xl p-6 text-center space-y-2"
                >
                  <Calendar className="w-12 h-12 mx-auto text-primary" />
                  <h3 className="font-semibold">Find Events</h3>
                  <p className="text-sm text-muted-foreground">Book tickets to live shows</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-secondary/50 rounded-xl p-6 text-center space-y-2"
                >
                  <Users className="w-12 h-12 mx-auto text-primary" />
                  <h3 className="font-semibold">Connect</h3>
                  <p className="text-sm text-muted-foreground">Join the community</p>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-lg text-muted-foreground mb-6">
                Sign in to explore artists and book events
              </p>
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="rounded-full px-8"
              >
                Get Started
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
