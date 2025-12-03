import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Plus, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Nav from '@/components/Nav';
import LocationAutocomplete from '@/components/LocationAutocomplete';

type Artist = {
  id: string;
  name: string;
  genre: string;
  image_url: string | null;
};

export default function CreateEvent() {
  const { user, session } = useAuth();
  const { canCreateEvents } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
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
    if (!user || !session) {
      toast.error('Please sign in to create an event');
      navigate('/login');
      return;
    }
    
    if (!canCreateEvents) {
      toast.error('You need artist or organizer role to create events');
      navigate('/');
      return;
    }

    fetchArtists();
    
    if (editId) {
      fetchEventForEdit(editId);
    }
  }, [user, session, canCreateEvents, editId]);

  const fetchArtists = async () => {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name, genre, image_url')
      .order('name');
    
    if (!error && data) {
      setArtists(data);
    }
  };

  const fetchEventForEdit = async (id: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      toast.error('Event not found');
      navigate('/events');
      return;
    }

    setEditingEvent(data);
    const paymentInfo = data.payment_link ? JSON.parse(data.payment_link) : {};
    
    setFormData({
      title: data.title,
      artistId: data.artist_id || '',
      date: data.date,
      time: data.time,
      locationName: data.location_name || '',
      locationLat: data.location_lat,
      locationLng: data.location_lng,
      price: data.price?.toString() || '',
      venmo: paymentInfo.venmo || '',
      cashapp: paymentInfo.cashapp || '',
      zelle: paymentInfo.zelle || '',
      paypal: paymentInfo.paypal || ''
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleLocationSelect = (location: { name: string; lat: number; lng: number } | null) => {
    if (location) {
      setFormData({
        ...formData,
        locationName: location.name,
        locationLat: location.lat,
        locationLng: location.lng
      });
    } else {
      setFormData({
        ...formData,
        locationName: '',
        locationLat: null,
        locationLng: null
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !session) {
      toast.error('Please sign in to create an event');
      return;
    }

    if (!formData.title || !formData.date || !formData.time) {
      toast.error('Please fill in required fields (title, date, time)');
      return;
    }

    if (formData.locationName && !formData.locationLat) {
      toast.error('Please select a location from the suggestions');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = editingEvent?.image_url || null;

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

      const eventData = {
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
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast.success('Event updated successfully!');
      } else {
        const { error } = await supabase
          .from('events')
          .insert({
            ...eventData,
            user_id: user.id
          });

        if (error) throw error;
        toast.success('Event created successfully!');
      }

      navigate('/events');
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editingEvent ? 'update' : 'create'} event`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </CardTitle>
              <CardDescription>
                {editingEvent ? 'Update your event details' : 'Schedule a Hindustani or Carnatic music performance'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Event Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Raga Yaman Recital, Thyagaraja Aradhana"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="time">Time *</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <LocationAutocomplete
                      value={formData.locationName}
                      onChange={handleLocationSelect}
                      placeholder="Search for a venue or address..."
                    />
                  </div>
                </div>

                <Separator />

                {/* Artist Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Featured Artist</h3>
                  
                  <div className="space-y-2">
                    <Label>Select Artist (Optional)</Label>
                    <Select
                      value={formData.artistId}
                      onValueChange={(value) => setFormData({ ...formData, artistId: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an artist or leave empty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No artist selected</SelectItem>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            <div className="flex items-center gap-2">
                              <span>{artist.name}</span>
                              <span className="text-muted-foreground text-xs">({artist.genre})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/create-artist-profile')}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Create New Artist Profile
                  </Button>
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pricing & Payment</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Ticket Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00 (leave empty for free event)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="venmo">Venmo</Label>
                      <Input
                        id="venmo"
                        value={formData.venmo}
                        onChange={(e) => setFormData({ ...formData, venmo: e.target.value })}
                        placeholder="@username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cashapp">Cash App</Label>
                      <Input
                        id="cashapp"
                        value={formData.cashapp}
                        onChange={(e) => setFormData({ ...formData, cashapp: e.target.value })}
                        placeholder="$cashtag"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zelle">Zelle</Label>
                      <Input
                        id="zelle"
                        value={formData.zelle}
                        onChange={(e) => setFormData({ ...formData, zelle: e.target.value })}
                        placeholder="email@example.com or phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paypal">PayPal</Label>
                      <Input
                        id="paypal"
                        value={formData.paypal}
                        onChange={(e) => setFormData({ ...formData, paypal: e.target.value })}
                        placeholder="@username"
                      />
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription className="text-sm">
                      Attendees will send payment using one of these methods and upload proof. You'll review and approve bookings from the event management area.
                    </AlertDescription>
                  </Alert>
                </div>

                <Separator />

                {/* Event Image */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Event Image</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image">Upload Image</Label>
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
                    {editingEvent?.image_url && !imageFile && (
                      <p className="text-sm text-muted-foreground">
                        Current image will be kept unless you upload a new one
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
