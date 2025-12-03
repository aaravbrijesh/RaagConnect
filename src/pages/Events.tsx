import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Plus, Upload, Edit, Search, ArrowLeft } from 'lucide-react';
import EventFilters, { DateFilter, SortOption, filterAndSortEvents } from '@/components/EventFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import Nav from '@/components/Nav';
import EventDiscussion from '@/components/EventDiscussion';
import BookingModal from '@/components/BookingModal';
import BookingManagement from '@/components/BookingManagement';
import { useNavigate } from 'react-router-dom';

export default function Events() {
  const { user, session } = useAuth();
  const { canCreateEvents, isAdmin } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [locationFilter, setLocationFilter] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    artistId: '',
    date: '',
    time: '',
    locationName: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    price: '',
    venmo: '',
    cashapp: '',
    zelle: '',
    paypal: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, artists(*), event_artists(artist_id, artists(*))')
      .order('date', { ascending: true });
    
    if (error) {
      toast.error('Failed to load events');
      console.error(error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleLocationSearch = async () => {
    if (!formData.locationName) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.locationName)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setFormData({
          ...formData,
          locationLat: parseFloat(data[0].lat),
          locationLng: parseFloat(data[0].lon)
        });
        toast.success('Location found!');
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      toast.error('Failed to search location');
    }
  };

  const handleOpenEdit = (event: any) => {
    setEditingEvent(event);
    setEditMode(true);
    
    const paymentInfo = event.payment_link ? JSON.parse(event.payment_link) : {};
    
    setFormData({
      title: event.title,
      artistId: event.artist_id || '',
      date: event.date,
      time: event.time,
      locationName: event.location_name || '',
      locationLat: event.location_lat,
      locationLng: event.location_lng,
      price: event.price?.toString() || '',
      venmo: paymentInfo.venmo || '',
      cashapp: paymentInfo.cashapp || '',
      zelle: paymentInfo.zelle || '',
      paypal: paymentInfo.paypal || ''
    });
    setOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!user || !session) {
      toast.error('Please sign in to create an event');
      setOpen(false);
      return;
    }

    if (!formData.title || !formData.date || !formData.time) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = editMode ? editingEvent?.image_url : null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const paymentInfo = JSON.stringify({
        venmo: formData.venmo || null,
        cashapp: formData.cashapp || null,
        zelle: formData.zelle || null,
        paypal: formData.paypal || null
      });

      if (editMode && editingEvent) {
        const { error } = await supabase
          .from('events')
          .update({
            title: formData.title,
            artist_id: formData.artistId || null,
            date: formData.date,
            time: formData.time,
            location_name: formData.locationName || null,
            location_lat: formData.locationLat,
            location_lng: formData.locationLng,
            price: formData.price ? parseFloat(formData.price) : null,
            payment_link: paymentInfo,
            image_url: imageUrl
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast.success('Event updated successfully!');
      } else {
        const { error } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            title: formData.title,
            artist_id: formData.artistId || null,
            date: formData.date,
            time: formData.time,
            location_name: formData.locationName || null,
            location_lat: formData.locationLat,
            location_lng: formData.locationLng,
            price: formData.price ? parseFloat(formData.price) : null,
            payment_link: paymentInfo,
            image_url: imageUrl
          });

        if (error) throw error;
        toast.success('Event created successfully!');
      }

      setOpen(false);
      setEditMode(false);
      setEditingEvent(null);
      setFormData({
        title: '',
        artistId: '',
        date: '',
        time: '',
        locationName: '',
        locationLat: null,
        locationLng: null,
        price: '',
        venmo: '',
        cashapp: '',
        zelle: '',
        paypal: ''
      });
      setImageFile(null);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editMode ? 'update' : 'create'} event`);
    } finally {
      setLoading(false);
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

        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-1">All Events</h1>
          <p className="text-muted-foreground">Browse all upcoming and past events</p>
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
                onClick={() => setSelectedEvent(event)}
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
                        if (!user || !session) {
                          toast.error('Please sign in to book this event', {
                            action: {
                              label: 'Sign In',
                              onClick: () => navigate('/login')
                            }
                          });
                          return;
                        }
                        setSelectedEvent(event);
                        setBookingModalOpen(true);
                      }}
                    >
                      Book Now
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
      </div>

      {/* Event Details Sheet */}
      <Sheet open={!!selectedEvent && !bookingModalOpen} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedEvent && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-2xl">{selectedEvent.title}</SheetTitle>
                    <SheetDescription>
                      {selectedEvent.event_artists && selectedEvent.event_artists.length > 0 
                        ? selectedEvent.event_artists.map((ea: any) => ea.artists?.name).filter(Boolean).join(', ') || 'Various Artists'
                        : selectedEvent.artists?.name || 'Various Artists'}
                    </SheetDescription>
                  </div>
                  {user && (selectedEvent.user_id === user.id || isAdmin) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedEvent(null);
                        navigate(`/events/create?edit=${selectedEvent.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Edit Event
                    </Button>
                  )}
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {selectedEvent.image_url && (
                  <div className="relative h-64 rounded-lg overflow-hidden">
                    <img
                      src={selectedEvent.image_url}
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      {new Date(selectedEvent.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="font-medium">{selectedEvent.time}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span className="font-medium">{selectedEvent.location_name || 'Location TBA'}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Ticket className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {selectedEvent.price ? `$${selectedEvent.price}` : 'Free Entry'}
                    </span>
                  </div>

                  <Button
                    className="w-full mt-4" 
                    size="lg"
                    onClick={() => {
                      if (!user || !session) {
                        toast.error('Please sign in to book this event', {
                          action: {
                            label: 'Sign In',
                            onClick: () => navigate('/login')
                          }
                        });
                        return;
                      }
                      setBookingModalOpen(true);
                    }}
                  >
                    Book Tickets Now
                  </Button>
                </div>

                <div className="pt-6 border-t">
                  {user && (selectedEvent.user_id === user.id || isAdmin) ? (
                    <Tabs defaultValue="announcements">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="announcements">Announcements</TabsTrigger>
                        <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="announcements" className="mt-6">
                        <EventDiscussion eventId={selectedEvent.id} organizerId={selectedEvent.user_id} />
                      </TabsContent>
                      
                      <TabsContent value="bookings" className="mt-6">
                        <BookingManagement eventId={selectedEvent.id} />
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <EventDiscussion eventId={selectedEvent.id} organizerId={selectedEvent.user_id} />
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Booking Modal */}
      {selectedEvent && (
        <BookingModal
          event={selectedEvent}
          open={bookingModalOpen}
          onOpenChange={setBookingModalOpen}
        />
      )}
    </div>
  );
}
