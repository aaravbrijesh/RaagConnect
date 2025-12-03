import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Music, Upload, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const artistProfileSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100, { message: "Name must be less than 100 characters" }),
  genre: z.string().trim().min(1, { message: "Specialization is required" }).max(100, { message: "Specialization must be less than 100 characters" }),
  bio: z.string().max(2000, { message: "Bio must be less than 2000 characters" }).optional(),
  locationName: z.string().max(200, { message: "Location must be less than 200 characters" }).optional(),
});

export default function CreateArtistProfile() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [customSpecialization, setCustomSpecialization] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [returnToEventCreate, setReturnToEventCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    genre: '',
    locationName: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    bio: ''
  });

  useEffect(() => {
    if (!user || !session) {
      toast.error('Please sign in to create an artist profile');
      navigate('/login');
    }
    
    // Check if we should return to event creation
    const shouldReturn = sessionStorage.getItem('returnToEventCreate');
    if (shouldReturn === 'true') {
      setReturnToEventCreate(true);
    }
  }, [user, session, navigate]);

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

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const specializations = [...selectedSpecializations];
    if (showCustomInput && customSpecialization.trim()) {
      specializations.push(customSpecialization.trim());
    }
    
    if (specializations.length === 0) {
      toast.error('Please select at least one specialization');
      return;
    }
    
    const finalGenre = specializations.join(', ');

    const validation = artistProfileSchema.safeParse({
      name: formData.name,
      genre: finalGenre,
      bio: formData.bio || undefined,
      locationName: formData.locationName || undefined
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

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

      const { data: newArtist, error } = await supabase
        .from('artists')
        .insert({
          user_id: user.id,
          name: formData.name,
          genre: finalGenre,
          location_name: formData.locationName || null,
          location_lat: formData.locationLat,
          location_lng: formData.locationLng,
          bio: formData.bio || null,
          image_url: imageUrl
        })
        .select('id')
        .single();

      if (error) throw error;

      // Update user's full_name in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: formData.name })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Failed to update profile name:', profileError);
      }

      toast.success('Profile created successfully!');

      // If we came from event creation, go back with the new artist selected
      if (returnToEventCreate && newArtist) {
        const savedData = sessionStorage.getItem('eventFormData');
        const eventFormData = savedData ? JSON.parse(savedData) : {};
        eventFormData.artistId = newArtist.id;
        sessionStorage.setItem('eventFormData', JSON.stringify(eventFormData));
        sessionStorage.removeItem('returnToEventCreate');
        navigate('/events/create');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleBack = () => {
    if (returnToEventCreate) {
      sessionStorage.removeItem('returnToEventCreate');
      navigate('/events/create');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-8 shadow-elegant border border-border/50">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4 gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {returnToEventCreate ? 'Back to Event Creation' : 'Back'}
          </Button>

          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">Create Your Artist Profile</h2>
              </div>
              <p className="text-muted-foreground">
                Complete your profile to start showcasing your music
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>

          <form onSubmit={handleCreateProfile} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Artist Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your artist name"
                required
              />
            </div>
            
            <div className="space-y-3">
              <Label>Specialization(s) *</Label>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'Tabla',
                  'Sitar',
                  'Hindustani Vocals',
                  'Carnatic Vocals',
                  'Violin (Carnatic)',
                  'Mridangam',
                  'Flute',
                  'Veena',
                  'Sarangi',
                  'Harmonium',
                  'Santoor',
                ].map((spec) => (
                  <div key={spec} className="flex items-center space-x-2">
                    <Checkbox
                      id={spec}
                      checked={selectedSpecializations.includes(spec)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSpecializations([...selectedSpecializations, spec]);
                        } else {
                          setSelectedSpecializations(selectedSpecializations.filter(s => s !== spec));
                        }
                      }}
                    />
                    <Label htmlFor={spec} className="cursor-pointer font-normal">
                      {spec}
                    </Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="other"
                    checked={showCustomInput}
                    onCheckedChange={(checked) => setShowCustomInput(!!checked)}
                  />
                  <Label htmlFor="other" className="cursor-pointer font-normal">
                    Other
                  </Label>
                </div>
              </div>
              {showCustomInput && (
                <Input
                  value={customSpecialization}
                  onChange={(e) => setCustomSpecialization(e.target.value)}
                  placeholder="Enter your specialization"
                  className="mt-2"
                />
              )}
              {selectedSpecializations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSpecializations.map((spec) => (
                    <Badge key={spec} variant="secondary">
                      {spec}
                    </Badge>
                  ))}
                  {showCustomInput && customSpecialization.trim() && (
                    <Badge variant="secondary">{customSpecialization.trim()}</Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Location</Label>
              <LocationAutocomplete
                value={formData.locationName}
                onChange={handleLocationSelect}
                placeholder="Search for your city or location..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself and your musical journey..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image">Profile Image</Label>
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

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading}
            >
              {loading ? 'Creating Profile...' : 'Create Profile & Continue'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            * Required fields
          </p>
        </div>
      </motion.div>
    </div>
  );
}
