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
import { Loader2, Upload, Music, Eye, Calendar, Settings as SettingsIcon, Moon, Sun, Trash2 } from 'lucide-react';
import Nav from '@/components/Nav';
import MyBookings from '@/components/MyBookings';
import { useSettings } from '@/hooks/useSettings';

export default function Settings() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>('viewer');
  const [newRole, setNewRole] = useState<'viewer' | 'artist' | 'organizer'>('viewer');
  const [updatingRole, setUpdatingRole] = useState(false);

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

  const handleDeleteAvatar = async () => {
    if (!user) return;

    setUploading(true);
    try {
      // List files in user's avatar folder
      const { data: files, error: listError } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (listError) throw listError;

      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }

      setAvatarUrl('');
      toast.success('Profile photo deleted');
    } catch (error: any) {
      toast.error('Error deleting avatar: ' + error.message);
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl} alt={fullName || 'User'} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-2">
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
                    {avatarUrl && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDeleteAvatar}
                        disabled={uploading}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
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
              <CardTitle>Role</CardTitle>
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

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Theme</Label>
                <RadioGroup
                  value={settings.theme}
                  onValueChange={(value: 'light' | 'dark') => {
                    updateSetting('theme', value);
                    document.documentElement.classList.toggle('dark', value === 'dark');
                    toast.success(`Theme set to ${value}`);
                  }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="light" id="light" />
                    <Sun className="h-4 w-4 text-amber-500" />
                    <Label htmlFor="light" className="flex-1 cursor-pointer">
                      Light
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="dark" id="dark" />
                    <Moon className="h-4 w-4 text-blue-500" />
                    <Label htmlFor="dark" className="flex-1 cursor-pointer">
                      Dark
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Session Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
              <CardDescription>Control how your login session behaves</CardDescription>
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

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-sm font-medium">
                    Email notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive email updates about your bookings and events
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => {
                    updateSetting('emailNotifications', checked);
                    toast.success(checked ? 'Email notifications enabled' : 'Email notifications disabled');
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="event-reminders" className="text-sm font-medium">
                    Event reminders
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get reminded before events you've booked
                  </p>
                </div>
                <Switch
                  id="event-reminders"
                  checked={settings.eventReminders}
                  onCheckedChange={(checked) => {
                    updateSetting('eventReminders', checked);
                    toast.success(checked ? 'Event reminders enabled' : 'Event reminders disabled');
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* My Bookings */}
          {user && <MyBookings userId={user.id} />}
        </div>
      </div>
    </>
  );
}
