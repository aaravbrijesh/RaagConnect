import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useNavigate } from 'react-router-dom';
import { Music, Calendar, MapPin, ArrowRight } from 'lucide-react';
import Nav from '@/components/Nav';
import EventsMap from '@/components/EventsMap';
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

export default function Home() {
  const { isSignedIn, user } = useAuth();
  const navigate = useNavigate();
  const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState(50);

  useEffect(() => {
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
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser. Please enter your zip code.');
      return;
    }

    toast.loading('Getting your location...', { id: 'location-loading' });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss('location-loading');
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationPermission('granted');
        toast.success('Location found! Showing nearby events.');
      },
      (error) => {
        toast.dismiss('location-loading');
        let errorMessage = 'Unable to get your location. ';
        
        if (error.code === 1) {
          errorMessage += 'Location access was denied. Please enable location permissions in your browser settings or enter your zip code.';
        } else if (error.code === 2) {
          errorMessage += 'Location information is unavailable. Please try again or enter your zip code.';
        } else if (error.code === 3) {
          errorMessage += 'Location request timed out. Please try again or enter your zip code.';
        }
        
        toast.error(errorMessage, { duration: 7000 });
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );
  };

  const handleZipCodeSubmit = async () => {
    const trimmedZip = zipCode.trim();
    if (!trimmedZip) {
      toast.error('Please enter a zip code');
      return;
    }

    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(trimmedZip)) {
      toast.error('Please enter a valid US zip code (e.g., 12345)');
      return;
    }

    const cleanZip = trimmedZip.split('-')[0];
    toast.loading('Looking up zip code...', { id: 'zip-loading' });

    try {
      // Primary: Zippopotam.us (reliable, free, no API key)
      const response = await fetch(`https://api.zippopotam.us/us/${cleanZip}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.places && data.places.length > 0) {
          const location = {
            lat: parseFloat(data.places[0].latitude),
            lng: parseFloat(data.places[0].longitude)
          };
          
          toast.dismiss('zip-loading');
          setUserLocation(location);
          setLocationPermission('granted');
          toast.success('Location found! Showing nearby events.');
          return;
        }
      }
      
      // Fallback: Nominatim
      const nomResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${cleanZip}&country=US&format=json&limit=1`,
        { headers: { 'User-Agent': 'RaagConnect/1.0' } }
      );
      const nomData = await nomResponse.json();
      
      if (nomData && nomData.length > 0) {
        const location = { lat: parseFloat(nomData[0].lat), lng: parseFloat(nomData[0].lon) };
        toast.dismiss('zip-loading');
        setUserLocation(location);
        setLocationPermission('granted');
        toast.success('Location found! Showing nearby events.');
        return;
      }
      
      throw new Error('No results');
    } catch (error) {
      toast.dismiss('zip-loading');
      toast.error('Unable to find this zip code. Please verify it is correct.', { duration: 5000 });
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
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/events')}
                className="h-12 px-8"
              >
                View Events
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

      {/* Nearby Events Section */}
      {!userLocation && (
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
                Find concerts and performances happening in your area
              </p>
              
              <div className="max-w-md mx-auto">
                <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border border-border">
                  <h3 className="font-semibold mb-2 text-center">Enter Your Zip Code</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Enter your 5-digit US zip code
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="e.g., 10001"
                      maxLength={5}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      onKeyDown={(e) => e.key === 'Enter' && handleZipCodeSubmit()}
                      className="text-center"
                    />
                    <Button onClick={handleZipCodeSubmit} className="h-10 px-6">
                      Find
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {userLocation && (
        <section className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-6 border border-border/50 mb-8">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-medium">Search Radius: {radius} miles</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setUserLocation(null);
                    setNearbyEvents([]);
                    setZipCode('');
                  }}
                >
                  Change Location
                </Button>
              </div>
              <Slider
                value={[radius]}
                onValueChange={(value) => setRadius(value[0])}
                min={10}
                max={200}
                step={10}
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground text-center">
                Drag to adjust search distance
              </p>
            </div>
          </div>
        </section>
      )}

      {userLocation && nearbyEvents.length === 0 && (
        <section className="container mx-auto px-4 pb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Events Near You</h2>
          
          {/* Show map even with no events */}
          <div className="mb-8">
            <EventsMap 
              events={[]}
              userLocation={userLocation}
              radius={radius}
              onEventClick={(eventId) => navigate(`/events`)}
            />
          </div>
          
          <Card className="p-8 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find any events within {radius} miles of your location.
            </p>
            <Button variant="outline" onClick={() => setRadius(Math.min(200, radius + 50))}>
              Expand Search Radius
            </Button>
          </Card>
        </section>
      )}

      {userLocation && nearbyEvents.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
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
          
          {/* Interactive Map */}
          <div className="mb-12">
            <EventsMap 
              events={nearbyEvents}
              userLocation={userLocation}
              radius={radius}
              onEventClick={(eventId) => navigate(`/events`)}
            />
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
                      <span>{Math.round(event.distance!)} mi away</span>
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

      {/* CTA Section */}
      {isSignedIn && (
        <section className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <Music className="w-12 h-12 text-primary mx-auto mb-6" />
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
