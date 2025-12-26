import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Plus, Edit, Search, ArrowRight } from 'lucide-react';
import EventFilters, { DateFilter, SortOption, filterAndSortEvents } from '@/components/EventFilters';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import Nav from '@/components/Nav';
import EventsMap from '@/components/EventsMap';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { user, session, needsRoleSelection } = useAuth();
  const { canCreateEvents, isAdmin } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [locationFilter, setLocationFilter] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState(50);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapEvents, setMapEvents] = useState<any[]>([]);

  // Redirect to role selection if needed
  useEffect(() => {
    if (needsRoleSelection) {
      navigate('/select-role');
    }
  }, [needsRoleSelection, navigate]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    
    // Get total count
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });
    
    setTotalEvents(count || 0);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Try to get upcoming events first
    let { data, error } = await supabase
      .from('events')
      .select('*, artists(*), event_artists(artist_id, artists(*))')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(8);
    
    // If no upcoming events, get past events instead
    if (!error && (!data || data.length === 0)) {
      const { data: pastData, error: pastError } = await supabase
        .from('events')
        .select('*, artists(*), event_artists(artist_id, artists(*))')
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(8);
      
      if (!pastError) {
        data = pastData;
      }
    }
    
    if (error) {
      toast.error('Failed to load events');
      console.error(error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleZipSearch = async () => {
    if (!zipCode) {
      toast.error('Please enter a zip code');
      return;
    }

    setMapLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode?q=${encodeURIComponent(zipCode)}&countrycodes=us&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      const data = await response.json();

      if (data && data.length > 0) {
        const location = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        setUserLocation(location);
        
        // Fetch events with location for distance calculation
        const { data: eventsData } = await supabase
          .from('events')
          .select('*, artists(*), event_artists(artist_id, artists(*))')
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null);

        if (eventsData) {
          // Calculate distance and filter by radius
          const eventsWithDistance = eventsData.map(event => {
            const distance = calculateDistance(
              location.lat, location.lng,
              event.location_lat!, event.location_lng!
            );
            return { ...event, distance };
          }).filter(event => event.distance <= searchRadius);
          
          setMapEvents(eventsWithDistance);
        }
        toast.success('Location found!');
      } else {
        toast.error('Zip code not found. Try a US zip code like 10001');
      }
    } catch (error) {
      console.error('Zip search error:', error);
      toast.error('Failed to search location. Please try again.');
    } finally {
      setMapLoading(false);
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Re-filter events when radius changes - use mapEvents base data, not limited events
  useEffect(() => {
    const refetchAndFilter = async () => {
      if (!userLocation) return;
      
      // Fetch all events with location for distance calculation
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, artists(*), event_artists(artist_id, artists(*))')
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null);

      if (eventsData) {
        const eventsWithDistance = eventsData.map(event => {
          const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            event.location_lat!, event.location_lng!
          );
          return { ...event, distance };
        }).filter(event => event.distance <= searchRadius);
        
        setMapEvents(eventsWithDistance);
      }
    };
    
    refetchAndFilter();
  }, [searchRadius, userLocation]);

  const filteredEvents = useMemo(() => {
    let result = events;
    
    // Apply search term
    if (searchTerm) {
      result = result.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply filters and sorting
    return filterAndSortEvents(result, dateFilter, locationFilter, sortBy);
  }, [events, searchTerm, dateFilter, locationFilter, sortBy]);

  const activeFilterCount = [
    dateFilter !== 'all' ? 1 : 0,
    locationFilter ? 1 : 0,
    sortBy !== 'date-asc' ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setDateFilter('all');
    setSortBy('date-asc');
    setLocationFilter('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-12 pb-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Discover Events
          </h1>
          <p className="text-lg text-muted-foreground">
            Find and book live Indian classical music performances near you.
          </p>
        </div>
      </section>

      {/* Events Section */}
      <section className="container mx-auto px-4 pb-16">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Button 
              size="sm"
              className="gap-1.5 md:gap-2 shrink-0"
              onClick={() => {
                if (!user || !session) {
                  toast.error('Please sign in to create an event', {
                    action: {
                      label: 'Sign In',
                      onClick: () => navigate('/login')
                    }
                  });
                  return;
                }
                if (!canCreateEvents) {
                  toast.error('You need artist or organizer role to create events');
                  return;
                }
                navigate('/events/create');
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Event</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>

          <EventFilters
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            locationFilter={locationFilter}
            onLocationFilterChange={setLocationFilter}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-40 bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredEvents.map((event) => (
                <Card 
                  key={event.id}
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div className="relative h-36 overflow-hidden bg-muted">
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    {(user?.id === event.user_id || isAdmin) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/events/create?edit=${event.id}`);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium line-clamp-1">{event.title}</h3>
                      <Badge variant={event.price ? "default" : "secondary"} className="text-xs shrink-0">
                        {event.price ? `$${event.price}` : 'Free'}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                      {event.event_artists && event.event_artists.length > 0 
                        ? event.event_artists.map((ea: any) => ea.artists?.name).filter(Boolean).join(', ') || 'TBA'
                        : event.artists?.name || 'TBA'}
                    </p>
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(event.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })} · {event.time}
                        </span>
                      </div>
                      {event.location_name && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{event.location_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full mt-3"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/${event.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* See All Events Button - Always show */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-10 text-center"
            >
              <Button 
                size="lg" 
                onClick={() => navigate('/events')}
                className="gap-2 px-8 py-6 text-lg"
              >
                See All Events
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </>
        ) : searchTerm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground text-lg mb-4">No events found matching "{searchTerm}"</p>
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No events yet</p>
            <p className="text-sm text-muted-foreground mt-2">Be the first to create an event!</p>
          </motion.div>
        )}
      </section>

      {/* Events Map Section */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Find Events Near You
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Enter your zip code to discover classical music performances in your area
            </p>
          </div>
          
          <div className="max-w-md mx-auto mb-8 space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter zip code"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleZipSearch} disabled={mapLoading}>
                {mapLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
            
            {userLocation && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Radius: {searchRadius} miles</span>
                  <Button variant="ghost" size="sm" onClick={() => setUserLocation(null)}>
                    Change Location
                  </Button>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
          
          {userLocation && (
            <EventsMap
              events={mapEvents}
              userLocation={userLocation}
              radius={searchRadius}
              onEventClick={(eventId) => navigate(`/events/${eventId}`)}
            />
          )}
          
          {!userLocation && (
            <div className="bg-muted/50 rounded-2xl p-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Enter a zip code above to see events on the map</p>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
