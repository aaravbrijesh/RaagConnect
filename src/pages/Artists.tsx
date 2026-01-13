import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Music, MapPin, Plus, Upload, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import Nav from '@/components/Nav';

export default function Artists() {
  const { user } = useAuth();
  const { canCreateArtistProfile, isAdmin } = useUserRoles(user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingArtist, setEditingArtist] = useState<any | null>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
    fetchArtists();
    // Check if we should auto-open the create dialog
    if (searchParams.get('create') === 'true') {
      setOpen(true);
      // Remove the query param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const fetchArtists = async () => {
    const { data: artistsData, error: artistsError } = await supabase
      .from('artists')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (artistsError) {
      toast.error('Failed to load artists');
      console.error(artistsError);
      return;
    }

    setArtists(artistsData || []);
  };

  const filteredArtists = artists.filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleLocationSearch = async () => {
    if (!formData.locationName) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/geocode?q=${encodeURIComponent(formData.locationName)}&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          }
        }
      );
      if (!response.ok) throw new Error('Geocoding request failed');
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

  const handleOpenEdit = (artist: any) => {
    setEditingArtist(artist);
    setEditMode(true);
    setFormData({
      name: artist.name,
      genre: artist.genre,
      locationName: artist.location_name || '',
      locationLat: artist.location_lat,
      locationLng: artist.location_lng,
      bio: artist.bio || ''
    });
    setOpen(true);
  };

  const handleCreateArtist = async () => {
    if (!user) {
      toast.error('You must be logged in to create an artist');
      return;
    }

    if (!formData.name || !formData.genre) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = editMode ? editingArtist?.image_url : null;

      // Upload image if provided
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

      if (editMode && editingArtist) {
        // Update artist
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
          .eq('id', editingArtist.id);

        if (error) throw error;
        toast.success('Artist updated successfully!');
      } else {
        // Create artist
        const { error } = await supabase
          .from('artists')
          .insert({
            user_id: user.id,
            name: formData.name,
            genre: formData.genre,
            location_name: formData.locationName || null,
            location_lat: formData.locationLat,
            location_lng: formData.locationLng,
            bio: formData.bio || null,
            image_url: imageUrl
          });

        if (error) throw error;
        toast.success('Artist created successfully!');
      }

      setOpen(false);
      setEditMode(false);
      setEditingArtist(null);
      setFormData({
        name: '',
        genre: '',
        locationName: '',
        locationLat: null,
        locationLng: null,
        bio: ''
      });
      setImageFile(null);
      fetchArtists();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editMode ? 'update' : 'create'} artist`);
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
                Discover Artists
              </h1>
              <p className="text-muted-foreground text-lg">
                Find maestros of Hindustani and Carnatic classical music
              </p>
            </div>
            
            <Dialog open={open} onOpenChange={(newOpen) => {
              if (newOpen && !user) {
                toast.error('Please sign in to create an artist profile', {
                  action: {
                    label: 'Sign In',
                    onClick: () => navigate('/login')
                  }
                });
                return;
              }
              if (newOpen && !canCreateArtistProfile) {
                toast.error('You need artist or organizer role to create profiles');
                return;
              }
              setOpen(newOpen);
            }}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Artist
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editMode ? 'Edit Artist' : 'Create New Artist'}</DialogTitle>
                  <DialogDescription>
                    {editMode ? 'Update artist profile' : 'Add a new artist to your platform'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Artist Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter artist name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="genre">Specialization</Label>
                    <Input
                      id="genre"
                      value={formData.genre}
                      onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                      placeholder="e.g. Hindustani Vocal, Carnatic Violin, Tabla, Veena, Sitar"
                    />
                    <p className="text-xs text-muted-foreground">
                      Examples: Khayal, Dhrupad, Thumri, Carnatic Vocal, Mridangam, Flute, Sarangi
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="flex gap-2">
                      <Input
                        id="location"
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
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about this artist..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image">Artist Image</Label>
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
                    setEditingArtist(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateArtist} disabled={loading}>
                    {loading ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Artist' : 'Create Artist')}
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
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by artist name or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-card/50 backdrop-blur-sm border-border/50"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtists.map((artist, index) => (
            <motion.div
              key={artist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="overflow-hidden hover:shadow-glow transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50 group">
                <div className="relative h-48 overflow-hidden">
                  {artist.image_url ? (
                    <img
                      src={artist.image_url}
                      alt={artist.name}
                      className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Music className="h-12 w-12 text-muted-foreground" />
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
                        handleOpenEdit(artist);
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
                  <CardDescription>
                    {artist.genre}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => navigate(`/artists/${artist.id}`)}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredArtists.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No artists found</p>
            <p className="text-sm text-muted-foreground mt-2">Try searching with different keywords</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
