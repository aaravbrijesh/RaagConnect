import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Music2, Calendar, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  location_name: string | null;
  price: number | null;
  image_url: string | null;
};

type Artist = {
  id: string;
  name: string;
  genre: string;
  image_url: string | null;
  bio: string | null;
};

export default function Home() {
  const { isSignedIn, user } = useAuth();
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [featuredArtists, setFeaturedArtists] = useState<Artist[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [eventsResult, artistsResult] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(3),
        supabase
          .from('artists')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      if (eventsResult.data) setUpcomingEvents(eventsResult.data);
      if (artistsResult.data) setFeaturedArtists(artistsResult.data);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      <Nav />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Celebrating Indian Classical Music</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
              Experience the Soul of Raga
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Connect with maestros, attend divine concerts, and immerse yourself in the timeless traditions of Hindustani and Carnatic music
            </p>

            {!isSignedIn ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate('/login')}
                  className="rounded-full px-8 h-14 text-lg group"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/events')}
                  className="rounded-full px-8 h-14 text-lg"
                >
                  Browse Events
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate('/events')}
                  className="rounded-full px-8 h-14 text-lg group"
                >
                  Explore Events
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/artists')}
                  className="rounded-full px-8 h-14 text-lg"
                >
                  Discover Artists
                </Button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
      </div>

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">Upcoming Concerts</h2>
                <p className="text-muted-foreground">Experience live classical music performances</p>
              </div>
              <Button variant="ghost" onClick={() => navigate('/events')} className="group">
                View All
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => navigate('/events')}
                  >
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="w-16 h-16 text-primary/40" />
                        </div>
                      )}
                      {event.price && (
                        <Badge className="absolute top-3 right-3 bg-background/90">
                          ₹{event.price}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                        {event.title}
                      </h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(event.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })} • {event.time}</span>
                        </div>
                        {event.location_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{event.location_name}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Featured Artists Section */}
      {featuredArtists.length > 0 && (
        <div className="container mx-auto px-4 py-16 bg-gradient-to-br from-muted/30 to-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-2">Featured Artists</h2>
                <p className="text-muted-foreground">Discover maestros of classical traditions</p>
              </div>
              <Button variant="ghost" onClick={() => navigate('/artists')} className="group">
                View All
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredArtists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => navigate(`/artists/${artist.id}`)}
                  >
                    <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
                      {artist.image_url ? (
                        <img src={artist.image_url} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="w-20 h-20 text-primary/40" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">
                        {artist.name}
                      </h3>
                      <Badge variant="secondary" className="mb-3">
                        {artist.genre}
                      </Badge>
                      {artist.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {artist.bio}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* CTA Section */}
      {isSignedIn && (
        <div className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-3xl p-12 text-center border border-primary/20"
          >
            <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Welcome back, {user?.email?.split('@')[0]}!
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Continue your journey through the divine world of Indian classical music. Explore new artists, book tickets to upcoming concerts, and connect with fellow music lovers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/events')} className="rounded-full">
                Browse Events
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/artists')} className="rounded-full">
                Discover Artists
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
