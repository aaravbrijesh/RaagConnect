import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Plus, Upload, CreditCard, Link as LinkIcon, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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

export default function Events() {
  const { user } = useAuth();
  const { canCreateEvents, isAdmin } = useUserRoles(user?.id);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    artistId: '',
    date: '',
    time: '',
    locationName: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    price: '',
    useStripeCheckout: false,
    venmo: '',
    cashapp: '',
    zelle: '',
    paypal: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
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
    
    // Parse payment info
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
      useStripeCheckout: event.use_stripe_checkout,
      venmo: paymentInfo.venmo || '',
      cashapp: paymentInfo.cashapp || '',
      zelle: paymentInfo.zelle || '',
      paypal: paymentInfo.paypal || ''
    });
    setOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!user) {
      toast.error('You must be logged in to create an event');
      return;
    }

    if (!formData.title || !formData.date || !formData.time) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = editMode ? editingEvent?.image_url : null;

      // Upload image if provided
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

      // Create payment info JSON if not using Stripe
      const paymentInfo = formData.useStripeCheckout ? null : JSON.stringify({
        venmo: formData.venmo || null,
        cashapp: formData.cashapp || null,
        zelle: formData.zelle || null,
        paypal: formData.paypal || null
      });

      if (editMode && editingEvent) {
        // Update event
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
            use_stripe_checkout: formData.useStripeCheckout,
            payment_link: paymentInfo,
            image_url: imageUrl
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast.success('Event updated successfully!');
      } else {
        // Create event
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
            use_stripe_checkout: formData.useStripeCheckout,
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
        useStripeCheckout: false,
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

  return (
    <div className="min-h-screen">
      <Nav />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Upcoming Concerts
              </h1>
              <p className="text-muted-foreground text-lg">
                Experience the divine tradition of Indian classical music
              </p>
            </div>
            
            {canCreateEvents && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Event
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editMode ? 'Edit Concert' : 'Create New Concert'}</DialogTitle>
                  <DialogDescription>
                    {editMode ? 'Update your concert details' : 'Schedule a Hindustani or Carnatic music performance'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Concert Title</Label>
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
                        placeholder="e.g. Shanmukhananda Hall, Mumbai or Narada Gana Sabha, Chennai"
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
                    <Label className="text-base">Payment Method</Label>
                    
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <Label htmlFor="stripe" className="font-medium">Use Stripe Checkout</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Stripe charges ~2.9% + $0.30 per transaction
                        </p>
                      </div>
                      <Switch
                        id="stripe"
                        checked={formData.useStripeCheckout}
                        onCheckedChange={(checked) => setFormData({ ...formData, useStripeCheckout: checked })}
                      />
                    </div>

                    {!formData.useStripeCheckout && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Payment Methods</Label>
                        <p className="text-xs text-muted-foreground">Add one or more payment options</p>
                        
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
                    )}
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
          )}
        </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <p className="text-muted-foreground">Showing {events.length} upcoming events</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
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
                      <div className="w-full h-full bg-muted flex items-center justify-center">
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
                          handleOpenEdit(event);
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
                            setSelectedEvent(event);
                            setBookingModalOpen(true);
                          }}
                        >
                          Book Now
                        </Button>
                      </div>
                      {event.use_stripe_checkout && (
                        <Badge variant="secondary" className="text-xs">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Stripe
                        </Badge>
                      )}
                    </CardContent>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Event Details & Discussion Sheet */}
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
                    {user && selectedEvent.user_id === user.id && (
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
                  {/* Event image */}
                  {selectedEvent.image_url && (
                    <div className="relative h-64 rounded-lg overflow-hidden">
                      <img
                        src={selectedEvent.image_url}
                        alt={selectedEvent.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Event details */}
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

                    {selectedEvent.use_stripe_checkout && (
                      <Badge variant="secondary">
                        <CreditCard className="h-4 w-4 mr-1" />
                        Stripe Checkout
                      </Badge>
                    )}

                    <Button 
                      className="w-full mt-4" 
                      size="lg"
                      onClick={() => setBookingModalOpen(true)}
                    >
                      Book Tickets Now
                    </Button>
                  </div>

                  {/* Tabs for Discussion and Bookings */}
                  <div className="pt-6 border-t">
                    <Tabs defaultValue="discussion">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="discussion">Discussion</TabsTrigger>
                        {user && selectedEvent.user_id === user.id && (
                          <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
                        )}
                      </TabsList>
                      
                      <TabsContent value="discussion" className="mt-6">
                        <EventDiscussion eventId={selectedEvent.id} />
                      </TabsContent>
                      
                      {user && selectedEvent.user_id === user.id && (
                        <TabsContent value="bookings" className="mt-6">
                          <BookingManagement eventId={selectedEvent.id} />
                        </TabsContent>
                      )}
                    </Tabs>
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

        {events.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No events found</p>
            <p className="text-sm text-muted-foreground mt-2">Try selecting a different category</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
