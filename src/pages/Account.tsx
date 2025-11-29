import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import Nav from '@/components/Nav';

export default function Account() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setFullName(data.full_name || '');
          setEmail(data.email || user.email || '');
        } else {
          setEmail(user.email || '');
        }

        // Check if user has artist profile with image
        const { data: artistData } = await supabase
          .from('artists')
          .select('image_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (artistData?.image_url) {
          setAvatarUrl(artistData.image_url);
        } else if (user.user_metadata?.avatar_url) {
          setAvatarUrl(user.user_metadata.avatar_url);
        }
      } catch (error: any) {
        toast.error('Error loading profile');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          email: email,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error('Error updating profile: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      toast.success('Avatar uploaded successfully!');
    } catch (error: any) {
      toast.error('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : email?.charAt(0).toUpperCase() || '?';

  return (
    <>
      <Nav />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} alt={fullName || 'User'} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploading} asChild>
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF (max. 5MB)
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <Button type="submit" disabled={updating} className="w-full">
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-2">Account Information</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>User ID: {user?.id}</p>
                <p>Provider: {user?.app_metadata?.provider || 'email'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
