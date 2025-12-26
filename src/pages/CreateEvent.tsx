import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, UserPlus, Users, X } from 'lucide-react';
import { z } from 'zod';
import EventScheduleEditor from '@/components/EventScheduleEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Nav from '@/components/Nav';
import LocationAutocomplete from '@/components/LocationAutocomplete';

// Validation schema for event form
const eventSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  price: z.string().optional().refine(
    (v) => !v || (!isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 10000),
    'Price must be between 0 and 10,000'
  ),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
  venmo: z.string().max(50, 'Venmo handle must be less than 50 characters').optional(),
  cashapp: z.string().max(50, 'Cash App handle must be less than 50 characters').optional(),
  zelle: z.string().max(100, 'Zelle must be less than 100 characters').optional(),
  paypal: z.string().max(50, 'PayPal handle must be less than 50 characters').optional(),
});

type Artist = {
  id: string;
  name: string;
  genre: string;
  image_url: string | null;
};

export default function CreateEvent() {
  const { user, session } = useAuth();
  const { canCreateEvents, loading: rolesLoading } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [loading, setLoading] = useState(false);
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [schedule, setSchedule] = useState<{ id: string; time: string; title: string; description: string }[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    locationName: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    price: '',
    venmo: '',
    cashapp: '',
    zelle: '',
    paypal: '',
    notes: '',
    confirmationType: 'online' as 'online' | 'at_the_door'
  });

  // Load form data from sessionStorage on mount
  useEffect(() => {
    const savedData = sessionStorage.getItem('eventFormData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setFormData(prev => ({ ...prev, ...parsed }));
      
      // Load selected artists
      if (parsed.artistIds && parsed.artistIds.length > 0) {
        fetchArtistsByIds(parsed.artistIds);
      }
      
      sessionStorage.removeItem('eventFormData');
    }
  }, []);

  useEffect(() => {
    if (!user || !session) {
      toast.error('Please sign in to create an event');
      navigate('/login');
      return;
    }
    
    if (rolesLoading) {
      return;
    }
    
    if (!canCreateEvents) {
      toast.error('You need artist or organizer role to create events');
      navigate('/');
      return;
    }

    if (editId) {
      fetchEventForEdit(editId);
    }
  }, [user, session, canCreateEvents, rolesLoading, editId]);

  const fetchArtistsByIds = async (artistIds: string[]) => {
    const { data, error } = await supabase
      .from('artists')
      .select('id, name, genre, image_url')
      .in('id', artistIds);
    
    if (!error && data) {
      setSelectedArtists(data);
    }
  };

  const fetchEventForEdit = async (id: string) => {
    // Fetch event data
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (eventError) {
      toast.error('Event not found');
      navigate('/events');
      return;
    }

    // Fetch event artists
    const { data: eventArtists } = await supabase
      .from('event_artists')
      .select('artist_id, artists(id, name, genre, image_url)')
      .eq('event_id', id);

    setEditingEvent(eventData);
    const paymentInfo = eventData.payment_link ? JSON.parse(eventData.payment_link) : {};
    
    setFormData({
      title: eventData.title,
      date: eventData.date,
      time: eventData.time,
      locationName: eventData.location_name || '',
      locationLat: eventData.location_lat,
      locationLng: eventData.location_lng,
      price: eventData.price?.toString() || '',
      venmo: paymentInfo.venmo || '',
      cashapp: paymentInfo.cashapp || '',
      zelle: paymentInfo.zelle || '',
      paypal: paymentInfo.paypal || '',
      notes: eventData.notes || '',
      confirmationType: (eventData.confirmation_type === 'at_the_door' ? 'at_the_door' : 'online') as 'online' | 'at_the_door'
    });

    // Set selected artists from junction table
    if (eventArtists && eventArtists.length > 0) {
      const artists = eventArtists
        .map((ea: any) => ea.artists)
        .filter(Boolean);
      setSelectedArtists(artists);
    } else if (eventData.artist_id) {
      // Backward compatibility: load from legacy artist_id field
      const { data: legacyArtist } = await supabase
        .from('artists')
        .select('id, name, genre, image_url')
        .eq('id', eventData.artist_id)
        .single();
      
      if (legacyArtist) {
        setSelectedArtists([legacyArtist]);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleFlyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFlyerFile(e.target.files[0]);
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

  const handleSelectArtists = () => {
    sessionStorage.setItem('eventFormData', JSON.stringify({
      ...formData,
      artistIds: selectedArtists.map(a => a.id)
    }));
    navigate('/events/create/selectartist');
  };

  const handleCreateNewArtist = () => {
    sessionStorage.setItem('eventFormData', JSON.stringify({
      ...formData,
      artistIds: selectedArtists.map(a => a.id)
    }));
    navigate('/events/create/createartist');
  };

  const handleRemoveArtist = (artistId: string) => {
    setSelectedArtists(prev => prev.filter(a => a.id !== artistId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !session) {
      toast.error('Please sign in to create an event');
      return;
    }

    // Validate form data with zod schema
    const validationResult = eventSchema.safeParse({
      title: formData.title,
      date: formData.date,
      time: formData.time,
      price: formData.price || undefined,
      notes: formData.notes || undefined,
      venmo: formData.venmo || undefined,
      cashapp: formData.cashapp || undefined,
      zelle: formData.zelle || undefined,
      paypal: formData.paypal || undefined,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    if (formData.locationName && !formData.locationLat) {
      toast.error('Please select a location from the suggestions');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = editingEvent?.image_url || null;
      let flyerUrl = editingEvent?.flyer_url || null;

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

      if (flyerFile) {
        const fileExt = flyerFile.name.split('.').pop();
        const fileName = `${user.id}/flyer-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(fileName, flyerFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        flyerUrl = publicUrl;
      }

      const paymentInfo = JSON.stringify({
        venmo: formData.venmo || null,
        cashapp: formData.cashapp || null,
        zelle: formData.zelle || null,
        paypal: formData.paypal || null
      });

      const eventData = {
        title: formData.title,
        artist_id: selectedArtists.length > 0 ? selectedArtists[0].id : null, // Keep for backward compatibility
        date: formData.date,
        time: formData.time,
        location_name: formData.locationName || null,
        location_lat: formData.locationLat,
        location_lng: formData.locationLng,
        price: formData.price ? parseFloat(formData.price) : null,
        payment_link: paymentInfo,
        image_url: imageUrl,
        flyer_url: flyerUrl,
        notes: formData.notes || null,
        confirmation_type: formData.price ? formData.confirmationType : null
      };

      let eventId: string;

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
        eventId = editingEvent.id;

        // Delete existing event_artists and re-create
        await supabase
          .from('event_artists')
          .delete()
          .eq('event_id', eventId);

        toast.success('Event updated successfully!');
      } else {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert({
            ...eventData,
            user_id: user.id
          })
          .select('id')
          .single();

        if (error) throw error;
        eventId = newEvent.id;
        toast.success('Event created successfully!');
      }

      // Insert event_artists relationships
      if (selectedArtists.length > 0) {
        const eventArtistRecords = selectedArtists.map(artist => ({
          event_id: eventId,
          artist_id: artist.id
        }));

        const { error: artistsError } = await supabase
          .from('event_artists')
          .insert(eventArtistRecords);

        if (artistsError) {
          console.error('Error linking artists:', artistsError);
        }
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

                {/* Artist Selection - Multiple */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Featured Artists</h3>
                  
                  {selectedArtists.length > 0 && (
                    <div className="space-y-2">
                      {selectedArtists.map(artist => (
                        <div key={artist.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                            {artist.image_url ? (
                              <img
                                src={artist.image_url}
                                alt={artist.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{artist.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{artist.genre}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveArtist(artist.id)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelectArtists}
                      className="gap-2 flex-1"
                    >
                      <Users className="h-4 w-4" />
                      {selectedArtists.length > 0 ? 'Add More Artists' : 'Select Existing Artists'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCreateNewArtist}
                      className="gap-2 flex-1"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create New Artist
                    </Button>
                  </div>
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

                  {/* Confirmation Type - Only for paid events */}
                  {formData.price && parseFloat(formData.price) > 0 && (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <Label className="text-sm font-medium">Booking Confirmation Method</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div 
                          className={`cursor-pointer transition-all rounded-lg border p-3 ${formData.confirmationType === 'online' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                          onClick={() => setFormData({ ...formData, confirmationType: 'online' })}
                        >
                          <div className="font-medium text-sm">Online Confirmation</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Review and approve each booking manually before the event
                          </p>
                        </div>
                        <div 
                          className={`cursor-pointer transition-all rounded-lg border p-3 ${formData.confirmationType === 'at_the_door' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                          onClick={() => setFormData({ ...formData, confirmationType: 'at_the_door' })}
                        >
                          <div className="font-medium text-sm">At-the-Door Confirmation</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Confirm payment and attendance when guests arrive
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Alert>
                    <AlertDescription className="text-sm">
                      Attendees will send payment using one of these methods and upload proof. You'll review and approve bookings from the event management area.
                    </AlertDescription>
                  </Alert>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Notes</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="e.g. RSVP required, agenda includes..., followed by dinner"
                      rows={3}
                    />
                  </div>
                </div>

                <Separator />

                {/* Event Schedule */}
                <EventScheduleEditor schedule={schedule} onChange={setSchedule} />

                <Separator />

                {/* Event Images */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Event Images</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="image">Event Photo</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="cursor-pointer flex-1"
                        />
                        {(imageFile || (editingEvent?.image_url && !imageFile)) && (
                          <div className="shrink-0">
                            <img
                              src={imageFile ? URL.createObjectURL(imageFile) : editingEvent?.image_url}
                              alt="Event preview"
                              className="h-12 w-12 object-cover rounded-md border"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="flyer">Event Flyer</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="flyer"
                          type="file"
                          accept="image/*"
                          onChange={handleFlyerChange}
                          className="cursor-pointer flex-1"
                        />
                        {(flyerFile || (editingEvent?.flyer_url && !flyerFile)) && (
                          <div className="shrink-0">
                            <img
                              src={flyerFile ? URL.createObjectURL(flyerFile) : editingEvent?.flyer_url}
                              alt="Flyer preview"
                              className="h-12 w-12 object-cover rounded-md border"
                            />
                          </div>
                        )}
                      </div>
                    </div>
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
