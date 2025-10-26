import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Plus, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Nav from '@/components/Nav';

export default function Events() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
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
    paypalHandle: ''
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
      let imageUrl = null;

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
          paypal_handle: formData.paypalHandle || null,
          image_url: imageUrl
        });

      if (error) throw error;

      toast.success('Event created successfully!');
      setOpen(false);
      setFormData({
        title: '',
        artistId: '',
        date: '',
        time: '',
        locationName: '',
        locationLat: null,
        locationLng: null,
        price: '',
        paypalHandle: ''
      });
      setImageFile(null);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
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
                Upcoming Events
              </h1>
              <p className="text-muted-foreground text-lg">
                Book tickets to amazing live performances
              </p>
            </div>
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>
                    Add a new event to your platform
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter event title"
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
                        placeholder="e.g. Blue Note Jazz Club, NY"
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
                  
                  <div className="grid grid-cols-2 gap-4">
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="paypal">PayPal Handle</Label>
                      <Input
                        id="paypal"
                        value={formData.paypalHandle}
                        onChange={(e) => setFormData({ ...formData, paypalHandle: e.target.value })}
                        placeholder="@yourhandle"
                      />
                    </div>
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
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEvent} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
              <Card className="overflow-hidden hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50 group">
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
                        
                        <Button className="min-w-32">
                          Book Now
                        </Button>
                      </div>
                      {event.paypal_handle && (
                        <p className="text-xs text-muted-foreground">
                          PayPal: {event.paypal_handle}
                        </p>
                      )}
                    </CardContent>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

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
