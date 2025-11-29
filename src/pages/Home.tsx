import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useNavigate } from 'react-router-dom';
import { Music, Calendar, Users, ArrowRight, Play, Star, MapPin } from 'lucide-react';
import Nav from '@/components/Nav';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  price: number | null;
  distance?: number;
};

type Artist = {
  id: string;
  name: string;
  genre: string;
};

export default function Home() {
  const { isSignedIn, user } = useAuth();
  const navigate = useNavigate();
  const [eventsThisWeek, setEventsThisWeek] = useState<Event[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [recentArtists, setRecentArtists] = useState<Artist[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState(50);

  useEffect(() => {
    fetchEventsThisWeek();
    fetchArtists();
    
    // Check if location permission was previously granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state);
        if (result.state === 'granted') {
          requestLocation();
        }
      });
    }
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyEvents();
    }
  }, [userLocation, radius]);

  const fetchEventsThisWeek = async () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', nextWeek.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(4);

    if (data) setEventsThisWeek(data);
  };

  const fetchNearbyEvents = async () => {
    if (!userLocation) return;

    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null)
      .order('date', { ascending: true });

    if (data) {
      // Calculate distance and sort by proximity
      const eventsWithDistance = data.map(event => ({
        ...event,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          event.location_lat!,
          event.location_lng!
        )
      }));

      const nearby = eventsWithDistance
        .filter(e => e.distance < radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4);

      setNearbyEvents(nearby);
    }
  };

  const fetchArtists = async () => {
    const { data } = await supabase
      .from('artists')
      .select('id, name, genre')
      .order('created_at', { ascending: false })
      .limit(6);

    if (data) setRecentArtists(data);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationPermission('granted');
          toast.success('Location access granted! Showing nearby events.');
        },
        (error) => {
          setLocationPermission('denied');
          toast.error('Location access denied. Try entering your zip code instead.');
        }
      );
    }
  };

  const handleZipCodeSubmit = async () => {
    if (!zipCode.trim()) {
      toast.error('Please enter a zip code');
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(zipCode)}&country=US`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setUserLocation({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        });
        setLocationPermission('granted');
        toast.success('Location found! Showing nearby events.');
      } else {
        toast.error('Zip code not found. Please try again.');
      }
    } catch (error) {
      toast.error('Failed to lookup zip code');
    }
  };

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

      {/* Events This Week */}
      {eventsThisWeek.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Events This Week</h2>
              <p className="text-muted-foreground">Don't miss these upcoming performances</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/events')}>
              View All
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {eventsThisWeek.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/events')}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-primary mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                    {event.location_name && (
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location_name}
                      </p>
                    )}
                    {event.price && (
                      <p className="text-sm font-semibold text-primary">${event.price}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby Events Section */}
      {locationPermission === 'prompt' && (
        <section className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl p-12 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative max-w-2xl mx-auto">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">Discover Events Near You</h2>
              <p className="text-muted-foreground mb-8 text-center">
                Share your location or enter your zip code to see concerts happening in your area
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6">
                  <h3 className="font-semibold mb-3 text-center">Share Location</h3>
                  <Button size="lg" onClick={requestLocation} className="w-full h-12">
                    Share Location
                    <MapPin className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                
                <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6">
                  <h3 className="font-semibold mb-3 text-center">Enter Zip Code</h3>
                  <div className="flex gap-2">
                    <Input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="Enter zip code"
                      onKeyDown={(e) => e.key === 'Enter' && handleZipCodeSubmit()}
                    />
                    <Button onClick={handleZipCodeSubmit} className="h-10">
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {userLocation && (
        <section className="container mx-auto px-4 pb-8">
          <div className="max-w-md mx-auto bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border/50">
            <Label className="text-sm font-medium mb-2 block">Search Radius: {radius} miles</Label>
            <Slider
              value={[radius]}
              onValueChange={(value) => setRadius(value[0])}
              min={10}
              max={200}
              step={10}
              className="mb-2"
            />
            <p className="text-xs text-muted-foreground text-center">
              Adjust to see events within {radius} miles
            </p>
          </div>
        </section>
      )}

      {nearbyEvents.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Events Near You</h2>
              <p className="text-muted-foreground">Performances happening in your area</p>
            </div>
            <Button variant="ghost" onClick={() => navigate('/events')}>
              View All
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {nearbyEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/events')}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-sm text-primary mb-3">
                      <MapPin className="w-4 h-4" />
                      <span>{Math.round(event.distance)} mi away</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {event.location_name && (
                      <p className="text-sm text-muted-foreground mb-2">{event.location_name}</p>
                    )}
                    {event.price && (
                      <p className="text-sm font-semibold text-primary">${event.price}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
