import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Plus, Upload, Edit, Search, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import EventsMap from '@/components/EventsMap';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { user, session } = useAuth();
  const { canCreateEvents, isAdmin } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState(50);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapEvents, setMapEvents] = useState<any[]>([]);
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
    
    // Get total count
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });
    
    setTotalEvents(count || 0);
    
    // Get first 8 events
    const { data, error } = await supabase
      .from('events')
      .select('*, artists(*)')
      .order('date', { ascending: true })
      .limit(8);
    
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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zipCode)}&countrycodes=us`
      );
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
          .select('*, artists(*)')
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
        toast.error('Zip code not found');
      }
    } catch (error) {
      toast.error('Failed to search location');
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

  // Re-filter events when radius changes
  useEffect(() => {
    if (userLocation && events.length > 0) {
      const eventsWithDistance = events
        .filter(e => e.location_lat && e.location_lng)
        .map(event => {
          const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            event.location_lat!, event.location_lng!
          );
          return { ...event, distance };
        }).filter(event => event.distance <= searchRadius);
      
      setMapEvents(eventsWithDistance);
    }
  }, [searchRadius, userLocation]);

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

  const filteredEvents = searchTerm 
    ? events.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : events;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 pt-16 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
              Discover <span className="text-primary">Events</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-xl">
              Experience the divine tradition of Indian classical music. Find and book live performances near you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Events Section */}
      <section className="container mx-auto px-4 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="max-w-md flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Dialog open={open} onOpenChange={(newOpen) => {
            if (newOpen && (!user || !session)) {
              toast.error('Please sign in to create an event', {
                action: {
                  label: 'Sign In',
                  onClick: () => navigate('/login')
                }
              });
              return;
            }
            if (newOpen && !canCreateEvents) {
              toast.error('You need artist or organizer role to create events');
              return;
            }
            setOpen(newOpen);
          }}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMode ? 'Edit Event' : 'Create New Event'}</DialogTitle>
                <DialogDescription>
                  {editMode ? 'Update your event details' : 'Schedule a Hindustani or Carnatic music performance'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Raga Yaman Recital, Thyagaraja Aradhana"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist (Optional)</Label>
                  <Input
                    id="artist"
                    value={formData.artistId}
                    onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
                    placeholder="Artist ID (leave blank if none)"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="flex gap-2">
                    <Input
                      id="location"
                      value={formData.locationName}
                      onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                      placeholder="e.g. Shanmukhananda Hall, Mumbai"
                    />
                    <Button type="button" onClick={handleLocationSearch} variant="outline">
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.locationLat && formData.locationLng && (
                    <p className="text-xs text-muted-foreground">
                      Coordinates: {formData.locationLat.toFixed(4)}, {formData.locationLng.toFixed(4)}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <Label className="text-base">Payment Methods</Label>
                  <p className="text-sm text-muted-foreground">Add one or more payment options for attendees</p>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="venmo" className="text-sm">Venmo</Label>
                      <Input
                        id="venmo"
                        value={formData.venmo}
                        onChange={(e) => setFormData({ ...formData, venmo: e.target.value })}
                        placeholder="@username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cashapp" className="text-sm">Cash App</Label>
                      <Input
                        id="cashapp"
                        value={formData.cashapp}
                        onChange={(e) => setFormData({ ...formData, cashapp: e.target.value })}
                        placeholder="$cashtag"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zelle" className="text-sm">Zelle</Label>
                      <Input
                        id="zelle"
                        value={formData.zelle}
                        onChange={(e) => setFormData({ ...formData, zelle: e.target.value })}
                        placeholder="email@example.com or phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paypal" className="text-sm">PayPal</Label>
                      <Input
                        id="paypal"
                        value={formData.paypal}
                        onChange={(e) => setFormData({ ...formData, paypal: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription className="text-xs">
                      Users will send payment using one of these methods and upload proof. You'll review and approve bookings.
                    </AlertDescription>
                  </Alert>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="image">Event Image</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                    {imageFile && (
                      <Badge variant="secondary">
                        <Upload className="h-3 w-3 mr-1" />
                        {imageFile.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => {
                  setOpen(false);
                  setEditMode(false);
                  setEditingEvent(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEvent} disabled={loading}>
                  {loading ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Event' : 'Create Event')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex"
                >
                  <Card 
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50 group cursor-pointer flex flex-col w-full"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="relative h-40 overflow-hidden">
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Calendar className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      {(user?.id === event.user_id || isAdmin) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(event);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                      <div className="absolute bottom-2 right-2">
                        <Badge variant={event.price ? "default" : "secondary"}>
                          {event.price ? `$${event.price}` : 'Free'}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">{event.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {event.artists?.name || 'Various Artists'}
                      </p>
                      
                      <div className="space-y-1.5 text-sm mt-auto">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {new Date(event.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span>{event.time}</span>
                        </div>
                        
                        {event.location_name && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span className="line-clamp-1">{event.location_name}</span>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full mt-4"
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
                    </CardContent>
                  </Card>
                </motion.div>
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
              onEventClick={(eventId) => {
                const event = events.find(e => e.id === eventId);
                if (event) setSelectedEvent(event);
              }}
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
                      {selectedEvent.artists?.name || 'Various Artists'}
                    </SheetDescription>
                  </div>
                  {user && (selectedEvent.user_id === user.id || isAdmin) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedEvent(null);
                        handleOpenEdit(selectedEvent);
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
