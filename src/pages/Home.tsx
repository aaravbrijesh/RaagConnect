import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Music, Calendar, MapPin, ArrowRight, Clock, Ticket } from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  location_name: string | null;
  price: number | null;
  image_url: string | null;
  artists?: {
    name: string;
  } | null;
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedEvents();
  }, []);

  const fetchFeaturedEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, artists(name)')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(6);

    if (!error && data) {
      setFeaturedEvents(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 pt-20 pb-16">
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
              Connect with masters of Hindustani and Carnatic traditions. Experience live events that move the soul.
            </p>
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/events')}
                className="h-12 px-8"
              >
                View All Events
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/artists')}
                className="h-12 px-8"
              >
                Discover Artists
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Upcoming Events</h2>
              <p className="text-muted-foreground">Experience the divine tradition of Indian classical music</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/events')} className="hidden sm:flex">
              See All Events
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardContent className="p-6 space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredEvents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group h-full"
                      onClick={() => navigate('/events')}
                    >
                      <div className="relative h-48 overflow-hidden">
                        {event.image_url ? (
                          <img
                            src={event.image_url}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <Calendar className="h-12 w-12 text-primary/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                        {event.price && (
                          <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                            ${event.price}
                          </div>
                        )}
                        {!event.price && (
                          <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-semibold">
                            Free
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-6">
                        <h3 className="font-bold text-lg mb-2 line-clamp-1">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {event.artists?.name || 'Various Artists'}
                        </p>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>
                              {new Date(event.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 text-primary" />
                            <span>{event.time}</span>
                          </div>
                          
                          {event.location_name && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="line-clamp-1">{event.location_name}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              
              {/* Mobile See All Button */}
              <div className="mt-8 text-center sm:hidden">
                <Button onClick={() => navigate('/events')} size="lg">
                  See All Events
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <Card className="p-12 text-center">
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Upcoming Events</h3>
              <p className="text-muted-foreground mb-6">
                Check back soon for new events in your area.
              </p>
              <Button variant="outline" onClick={() => navigate('/artists')}>
                Discover Artists Instead
              </Button>
            </Card>
          )}
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl p-12 overflow-hidden text-center"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="relative max-w-2xl mx-auto">
            <Music className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join the Classical Music Community
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Connect with artists, discover performances, and immerse yourself in the timeless beauty of Indian classical music.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/events')}>
                Browse Events
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/artists')}>
                Meet the Artists
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
