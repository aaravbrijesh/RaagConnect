import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import Nav from '@/components/Nav';
import ClassAvailabilityEditor, { AvailabilitySlot } from '@/components/ClassAvailabilityEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, GraduationCap, ArrowLeft } from 'lucide-react';
import LocationAutocomplete from '@/components/LocationAutocomplete';

export default function CreateClass() {
  const { user } = useAuth();
  const { isArtist, isOrganizer, isAdmin, hasRole } = useUserRoles(user?.id);
  const navigate = useNavigate();
  const isTeacher = hasRole('teacher' as any);
  const canCreate = isArtist || isOrganizer || isTeacher || isAdmin;

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [skillLevel, setSkillLevel] = useState('all');
  const [classType, setClassType] = useState('in-person');
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [price, setPrice] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [recurringSchedule, setRecurringSchedule] = useState('');
  const [scheduleDetails, setScheduleDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);

  if (!user || !canCreate) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">You need to be an artist, organizer, or teacher to list a class.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/classes')}>Back to Classes</Button>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('event-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('event-images').getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !genre.trim()) {
      toast.error('Title and genre are required');
      return;
    }
    setLoading(true);
    try {
      const { data: classData, error } = await supabase.from('classes').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        genre: genre.trim(),
        skill_level: skillLevel,
        class_type: classType,
        location_name: locationName || null,
        location_lat: locationLat,
        location_lng: locationLng,
        price: price ? parseFloat(price) : null,
        max_capacity: maxCapacity ? parseInt(maxCapacity) : null,
        contact_info: contactInfo.trim() || null,
        image_url: imageUrl || null,
        recurring_schedule: recurringSchedule.trim() || null,
        schedule_details: scheduleDetails.trim() || null,
      }).select('id').single();
      if (error) throw error;

      // Save availability slots
      if (availabilitySlots.length > 0 && classData) {
        const { error: availError } = await supabase.from('class_availability').insert(
          availabilitySlots.map(slot => ({
            class_id: classData.id,
            user_id: user.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            slot_duration_minutes: slot.slot_duration_minutes,
          }))
        );
        if (availError) console.error('Failed to save availability:', availError);
      }

      toast.success('Class listed successfully!');
      navigate('/classes');
    } catch (err: any) {
      toast.error('Failed to create class: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate('/classes')}>
          <ArrowLeft className="h-4 w-4" /> Back to Classes
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              List a New Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Class Title *</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Beginner Sitar Lessons" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn?" rows={4} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre / Instrument *</Label>
                  <Input id="genre" value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Sitar, Tabla, Vocal" required />
                </div>
                <div className="space-y-2">
                  <Label>Skill Level</Label>
                  <Select value={skillLevel} onValueChange={setSkillLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Class Type</Label>
                <RadioGroup value={classType} onValueChange={setClassType} className="flex gap-4">
                  <label htmlFor="ct-inperson" className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="in-person" id="ct-inperson" />
                    <span className="text-sm">In-Person</span>
                  </label>
                  <label htmlFor="ct-online" className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="online" id="ct-online" />
                    <span className="text-sm">Online</span>
                  </label>
                  <label htmlFor="ct-both" className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="both" id="ct-both" />
                    <span className="text-sm">Both</span>
                  </label>
                </RadioGroup>
              </div>

              {(classType === 'in-person' || classType === 'both') && (
                <div className="space-y-2">
                  <Label>Location</Label>
                  <LocationAutocomplete
                    value={locationName}
                    onChange={(loc) => {
                      if (loc) {
                        setLocationName(loc.name);
                        setLocationLat(loc.lat);
                        setLocationLng(loc.lng);
                      } else {
                        setLocationName('');
                        setLocationLat(null);
                        setLocationLng(null);
                      }
                    }}
                    placeholder="Where are classes held?"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (per session)</Label>
                  <Input id="price" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Leave empty for 'Contact for pricing'" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Max Capacity</Label>
                  <Input id="capacity" type="number" min="1" value={maxCapacity} onChange={e => setMaxCapacity(e.target.value)} placeholder="Optional" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule (e.g. "Tuesdays & Thursdays, 5-6 PM")</Label>
                <Input id="schedule" value={recurringSchedule} onChange={e => setRecurringSchedule(e.target.value)} placeholder="When do classes happen?" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduleDetails">Additional Schedule Details</Label>
                <Textarea id="scheduleDetails" value={scheduleDetails} onChange={e => setScheduleDetails(e.target.value)} placeholder="Any extra scheduling info, breaks, semester dates, etc." rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Contact Info</Label>
                <Input id="contact" value={contactInfo} onChange={e => setContactInfo(e.target.value)} placeholder="Email, phone, or website" />
              </div>

              <div className="space-y-2">
                <Label>Class Image</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                {imageUrl && <img src={imageUrl} alt="Preview" className="h-32 rounded-lg object-cover mt-2" />}
              </div>

              <ClassAvailabilityEditor slots={availabilitySlots} onChange={setAvailabilitySlots} />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : 'List Class'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
