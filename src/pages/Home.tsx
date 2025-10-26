import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Music, Calendar, Users, ArrowRight, Play, Star } from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/integrations/supabase/client';

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  location_name: string | null;
  price: number | null;
};

type Artist = {
  id: string;
  name: string;
  genre: string;
};

export default function Home() {
  const { isSignedIn, user } = useAuth();
  const navigate = useNavigate();
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [recentArtists, setRecentArtists] = useState<Artist[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [eventResult, artistsResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(1)
          .single(),
        supabase
          .from('artists')
          .select('id, name, genre')
          .order('created_at', { ascending: false })
          .limit(6),
      ]);

      if (eventResult.data) setNextEvent(eventResult.data);
      if (artistsResult.data) setRecentArtists(artistsResult.data);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
              Classical Music.
              <br />
              <span className="text-primary">Rediscovered.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-xl">
              Connect with masters of Hindustani and Carnatic traditions. Experience live concerts that move the soul.
            </p>
            {isSignedIn ? (
              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/events')}
                  className="h-12 px-8"
                >
                  Explore Events
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/artists')}
                  className="h-12 px-8"
                >
                  View Artists
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate('/login')}
                className="h-12 px-8"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Next Event Highlight */}
      {nextEvent && (
        <section className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl p-12 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-sm text-primary mb-4">
                <Play className="w-4 h-4" />
                <span className="font-semibold">NEXT CONCERT</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">{nextEvent.title}</h2>
              <div className="flex flex-wrap gap-6 text-muted-foreground mb-8">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(nextEvent.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {nextEvent.location_name && (
                  <div className="flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    <span>{nextEvent.location_name}</span>
                  </div>
                )}
              </div>
              <Button
                size="lg"
                onClick={() => navigate('/events')}
                className="h-12 px-8"
              >
                View Details
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </section>
      )}

      {/* Quick Stats */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Music className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Discover Artists</h3>
            <p className="text-muted-foreground">
              Explore maestros of classical music traditions
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Attend Concerts</h3>
            <p className="text-muted-foreground">
              Book tickets to live performances
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Join Community</h3>
            <p className="text-muted-foreground">
              Connect with fellow music enthusiasts
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured Artists */}
      {recentArtists.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Artists</h2>
              <p className="text-muted-foreground">Masters of their craft</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/artists')}>
              View All
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {recentArtists.map((artist, index) => (
              <motion.div
                key={artist.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                onClick={() => navigate(`/artists/${artist.id}`)}
                className="cursor-pointer group"
              >
                <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl mb-3 flex items-center justify-center group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
                  <Music className="w-12 h-12 text-primary/40" />
                </div>
                <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                  {artist.name}
                </h3>
                <p className="text-xs text-muted-foreground">{artist.genre}</p>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      {isSignedIn && (
        <section className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <Star className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Welcome back, {user?.email?.split('@')[0]}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Your journey through classical music continues. Explore new artists and book your next concert experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/events')}>
                Browse Events
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/artists')}>
                Discover Artists
              </Button>
            </div>
          </motion.div>
        </section>
      )}
    </div>
  );
}
