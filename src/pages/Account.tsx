import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Upload, Music, Eye, Calendar, Settings } from 'lucide-react';
import Nav from '@/components/Nav';
import MyBookings from '@/components/MyBookings';
import { useSettings } from '@/hooks/useSettings';

export default function Account() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>('viewer');
  const [newRole, setNewRole] = useState<'viewer' | 'artist' | 'organizer'>('viewer');
  const [updatingRole, setUpdatingRole] = useState(false);
  const { settings, updateSetting } = useSettings();

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

        // Load user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleData?.role) {
          setCurrentRole(roleData.role);
          setNewRole(roleData.role as 'viewer' | 'artist' | 'organizer');
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
        .update({
          full_name: fullName,
          email: email,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

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
      
      // Add cache buster to force update
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
      toast.success('Avatar uploaded successfully!');
    } catch (error: any) {
      toast.error('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!user || newRole === currentRole) return;

    setUpdatingRole(true);
    try {
      // Update existing role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentRole(newRole);
      toast.success('Role updated successfully!');

      // If changed to artist, offer to create profile
      if (newRole === 'artist') {
        toast.info('Would you like to create an artist profile?', {
          action: {
            label: 'Create Profile',
            onClick: () => navigate('/create-artist-profile')
          }
        });
      }
    } catch (error: any) {
      toast.error('Error updating role: ' + error.message);
    } finally {
      setUpdatingRole(false);
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
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
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

          </CardContent>
        </Card>

        {/* Role Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Role Settings</CardTitle>
            <CardDescription>Change how you use Raag Connect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Current role: <span className="font-medium text-foreground capitalize">{currentRole}</span>
            </div>

            <RadioGroup value={newRole} onValueChange={(value) => setNewRole(value as 'viewer' | 'artist' | 'organizer')}>
              <div className="space-y-2">
                <div 
                  className={`cursor-pointer transition-all rounded-lg border ${newRole === 'viewer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setNewRole('viewer')}
                >
                  <div className="p-3 flex items-center gap-3">
                    <RadioGroupItem value="viewer" id="role-viewer" />
                    <div className="flex-1">
                      <label htmlFor="role-viewer" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        Viewer
                      </label>
                      <p className="text-xs text-muted-foreground">Discover and book events</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`cursor-pointer transition-all rounded-lg border ${newRole === 'artist' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setNewRole('artist')}
                >
                  <div className="p-3 flex items-center gap-3">
                    <RadioGroupItem value="artist" id="role-artist" />
                    <div className="flex-1">
                      <label htmlFor="role-artist" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        Artist
                      </label>
                      <p className="text-xs text-muted-foreground">Create your profile and showcase music</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`cursor-pointer transition-all rounded-lg border ${newRole === 'organizer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setNewRole('organizer')}
                >
                  <div className="p-3 flex items-center gap-3">
                    <RadioGroupItem value="organizer" id="role-organizer" />
                    <div className="flex-1">
                      <label htmlFor="role-organizer" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Organizer
                      </label>
                      <p className="text-xs text-muted-foreground">Create and manage events</p>
                    </div>
                  </div>
                </div>
              </div>
            </RadioGroup>

            <Button 
              onClick={handleUpdateRole} 
              disabled={updatingRole || newRole === currentRole}
              className="w-full"
            >
              {updatingRole ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* App Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              App Settings
            </CardTitle>
            <CardDescription>Customize your app experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="stay-signed-in" className="text-sm font-medium">
                  Stay signed in
                </Label>
                <p className="text-xs text-muted-foreground">
                  Keep your session active between browser visits
                </p>
              </div>
              <Switch
                id="stay-signed-in"
                checked={settings.staySignedIn}
                onCheckedChange={(checked) => {
                  updateSetting('staySignedIn', checked);
                  toast.success(checked ? 'You will stay signed in' : 'Session will expire when you close the browser');
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* My Bookings */}
        {user && <MyBookings userId={user.id} />}
      </div>
    </>
  );
}
