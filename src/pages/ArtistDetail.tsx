import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, MapPin, Calendar, ArrowLeft, Edit, Upload, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import Nav from '@/components/Nav';

export default function ArtistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRoles(user?.id);
  const [artist, setArtist] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    genre: '',
    locationName: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    bio: ''
  });

  useEffect(() => {
    fetchArtistDetails();
  }, [id]);

  const fetchArtistDetails = async () => {
    if (!id) return;

    try {
      // Fetch artist
      const { data: artistData, error: artistError } = await supabase
        .from('artists')
        .select('*')
        .eq('id', id)
        .single();

      if (artistError) throw artistError;
      setArtist(artistData);
      
      // Initialize form data
      setFormData({
        name: artistData.name,
        genre: artistData.genre,
        locationName: artistData.location_name || '',
        locationLat: artistData.location_lat,
        locationLng: artistData.location_lng,
        bio: artistData.bio || ''
      });

      // Fetch artist's events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('artist_id', id)
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;
      
      // Split into upcoming and past events
      const today = new Date().toISOString().split('T')[0];
      const upcoming = (eventsData || []).filter(e => e.date >= today);
      const past = (eventsData || []).filter(e => e.date < today).reverse();
      
      setUpcomingEvents(upcoming);
      setPastEvents(past);
    } catch (error: any) {
      toast.error('Failed to load artist details');
      console.error(error);
    } finally {
      setLoading(false);
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

  const handleUpdateProfile = async () => {
    if (!user || !artist) return;

    if (!formData.name || !formData.genre) {
      toast.error('Please fill in required fields');
      return;
    }

    setEditLoading(true);

    try {
      let imageUrl = artist.image_url;

      // Upload new image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('artist-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('artist-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Update artist profile
      const { error } = await supabase
        .from('artists')
        .update({
          name: formData.name,
          genre: formData.genre,
          location_name: formData.locationName || null,
          location_lat: formData.locationLat,
          location_lng: formData.locationLng,
          bio: formData.bio || null,
          image_url: imageUrl
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setEditOpen(false);
      setImageFile(null);
      fetchArtistDetails();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const isOwnerOrAdmin = user && artist && (user.id === artist.user_id || isAdmin);

  const handleDeleteArtist = async () => {
    try {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', artist.id);
      
      if (error) throw error;
      
      toast.success('Artist profile deleted successfully');
      navigate('/artists');
    } catch (error: any) {
      toast.error('Failed to delete artist profile');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Artist not found</p>
          <div className="text-center mt-4">
            <Button onClick={() => navigate('/artists')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Artists
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/artists')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Artists
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-border/50">
            <div className="relative h-64 md:h-96 overflow-hidden">
              {artist.image_url ? (
                <img
                  src={artist.image_url}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Music className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">
                    {artist.name}
                  </h1>
                  <Badge className="bg-primary/90 backdrop-blur-sm text-lg px-4 py-1">
                    {artist.genre}
                  </Badge>
                </div>
                {isOwnerOrAdmin && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setEditOpen(true)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Artist Profile</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{artist.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteArtist}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{artist.location_name || 'Location not specified'}</span>
              </div>

              {artist.bio && (
                <div>
                  <h3 className="text-xl font-semibold mb-2">About</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {artist.bio}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Upcoming Events
          </h2>

          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        {event.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location_name || 'Location TBA'}</span>
                      </div>
                      {event.price && (
                        <p className="text-lg font-semibold text-primary">
                          ${event.price}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center bg-card/50 backdrop-blur-sm border-border/50">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground">No upcoming events</p>
              <p className="text-sm text-muted-foreground mt-2">Check back later for new performances</p>
            </Card>
          )}
        </motion.div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12"
          >
            <h2 className="text-3xl font-bold mb-6 text-muted-foreground">
              Past Events
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-md transition-all duration-300 bg-muted/30 border-border/30 opacity-75">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5" />
                        {event.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location_name || 'Location TBA'}</span>
                      </div>
                      {event.price && (
                        <p className="text-lg font-semibold text-muted-foreground">
                          ${event.price}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Artist Profile</DialogTitle>
            <DialogDescription>
              Update your artist information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Artist Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter artist name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-genre">Specialization</Label>
              <Input
                id="edit-genre"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                placeholder="e.g. Hindustani Vocal, Carnatic Violin, Tabla"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-location"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                  placeholder="e.g. Los Angeles, CA"
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
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-image">Update Image</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="edit-image"
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={editLoading}>
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
