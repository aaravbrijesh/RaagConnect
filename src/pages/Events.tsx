import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Plus, Upload, Edit, Search, ArrowLeft, Music, Map } from 'lucide-react';
import EventsMap from '@/components/EventsMap';
import { Slider } from '@/components/ui/slider';
import EventFilters, { DateFilter, SortOption, filterAndSortEvents } from '@/components/EventFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import Nav from '@/components/Nav';
import { useNavigate } from 'react-router-dom';
import { fetchAllEventsWithRelations } from '@/lib/events';

export default function Events() {
  const { user, session } = useAuth();
  const { canCreateEvents, canCreateArtistProfile, isAdmin } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [artistSearchTerm, setArtistSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [locationFilter, setLocationFilter] = useState('');
  const hasSetInitialDateFilter = useRef(false);

  useEffect(() => {
    fetchEvents();
    fetchArtists();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);

    const { data, error } = await fetchAllEventsWithRelations({ ascending: true });

    if (error) {
      toast.error('Failed to load events');
      console.error(error);
    } else {
      setEvents(data || []);

      if (!hasSetInitialDateFilter.current) {
        const today = new Date().toISOString().split('T')[0];
        const hasUpcoming = (data || []).some((e: any) => typeof e?.date === 'string' && e.date >= today);
        if (hasUpcoming) setDateFilter('upcoming');
        hasSetInitialDateFilter.current = true;
      }
    }

    setLoading(false);
  };

  const fetchArtists = async () => {
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load artists', error);
    } else {
      setArtists(data || []);
    }
  };

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

  const filteredArtists = useMemo(() => {
    if (!artistSearchTerm) return artists;
    const q = artistSearchTerm.toLowerCase();
    return artists.filter(
      (a) => a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q)
    );
  }, [artists, artistSearchTerm]);

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
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Discover Events
          </h1>
          <p className="text-muted-foreground text-lg">Browse all upcoming and past events</p>
        </div>

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm flex-1">
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
              className="gap-2"
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
              Create Event
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

        <p className="text-sm text-muted-foreground mb-4">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 h-36 bg-muted rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none" />
                  <div className="flex-1 p-4 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredEvents.map((event) => (
              <Card 
                key={event.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="relative w-full sm:w-48 h-36 overflow-hidden bg-muted shrink-0">
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
                  
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
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
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </span>
                      {event.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{event.location_name}</span>
                        </span>
                      )}
                    </div>
                    
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/events/${event.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No events found</p>
          </div>
        )}

        {/* Artists Section */}
        <div className="mt-16 border-t border-border pt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Discover Artists
              </h2>
              <p className="text-muted-foreground mt-1">Find maestros of Hindustani and Carnatic classical music</p>
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                if (!user || !session) {
                  toast.error('Please sign in to create an artist profile', {
                    action: { label: 'Sign In', onClick: () => navigate('/login') },
                  });
                  return;
                }
                if (!canCreateArtistProfile) {
                  toast.error('You need artist or organizer role to create profiles');
                  return;
                }
                navigate('/create-artist-profile');
              }}
            >
              <Plus className="h-4 w-4" />
              Create Artist
            </Button>
          </div>

          <div className="relative max-w-sm mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search artists..."
              value={artistSearchTerm}
              onChange={(e) => setArtistSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {filteredArtists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArtists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <Card
                    className="overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group"
                    onClick={() => navigate(`/artists/${artist.id}`)}
                  >
                    <div className="relative h-48 overflow-hidden">
                      {artist.image_url ? (
                        <img
                          src={artist.image_url}
                          alt={artist.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Music className="h-12 w-12 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                      <Badge className="absolute top-4 right-4 bg-primary/90 backdrop-blur-sm">
                        {artist.genre}
                      </Badge>
                      {(user?.id === artist.user_id || isAdmin) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-4 left-4 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/artists/${artist.id}`);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5 text-primary" />
                        {artist.name}
                      </CardTitle>
                      <CardDescription>{artist.genre}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="w-full" variant="outline">
                        View Profile
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No artists found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
