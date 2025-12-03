import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Plus, Upload, Edit, Search, ArrowLeft } from 'lucide-react';
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
      .select('*, artists(*)')
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

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                All Events
              </h1>
              <p className="text-muted-foreground text-lg">
                Browse all upcoming and past events
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            <div className="max-w-md flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search events by title or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button 
              size="lg" 
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
              <Plus className="h-5 w-5" />
              Create Event
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <p className="text-muted-foreground">
            Showing {filteredEvents.length} events
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-64 h-48 bg-muted" />
                  <div className="flex-1 p-6 space-y-3">
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * Math.min(index, 5) }}
              >
                <Card 
                  className="overflow-hidden hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50 group cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="relative w-full md:w-64 h-48 overflow-hidden">
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Calendar className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-background/50 to-transparent" />
                      {(user?.id === event.user_id || isAdmin) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 right-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/create?edit=${event.id}`);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <CardHeader>
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <CardDescription className="text-base">
                          {event.artists?.name || 'Various Artists'}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{event.time}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{event.location_name || 'Location TBA'}</span>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <Ticket className="h-5 w-5 text-primary" />
                            <span className="text-2xl font-bold">
                              {event.price ? `$${event.price}` : 'Free'}
                            </span>
                          </div>
                          
                          <Button 
                            className="min-w-32"
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
                      </CardContent>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : searchTerm ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground text-lg">No events found matching "{searchTerm}"</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No events found</p>
            <p className="text-sm text-muted-foreground mt-2">Check back soon for new performances</p>
          </motion.div>
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
