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
import { Loader2, Upload, Music, Eye, Calendar, Settings as SettingsIcon, Moon, Sun, Trash2, GraduationCap } from 'lucide-react';
import Nav from '@/components/Nav';
import MyBookings from '@/components/MyBookings';
import PaymentSettings from '@/components/PaymentSettings';
import PaymentMethodsEditor from '@/components/PaymentMethodsEditor';
import { useSettings } from '@/hooks/useSettings';
import { useUserRoles, type UserRole } from '@/hooks/useUserRoles';

const ROLE_PRIORITY: UserRole[] = ['admin', 'organizer', 'artist', 'teacher', 'viewer'];
const SELF_SERVICE_ROLES: Exclude<UserRole, 'admin'>[] = ['viewer', 'artist', 'organizer', 'teacher'];

export default function Settings() {
  const { user, session, authLoading } = useAuth();
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const { roles, loading: rolesLoading, refetch: refetchRoles } = useUserRoles(user?.id);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('viewer');
  const [currentEditableRole, setCurrentEditableRole] = useState<Exclude<UserRole, 'admin'>>('viewer');
  const [newRole, setNewRole] = useState<'viewer' | 'artist' | 'organizer' | 'teacher'>('viewer');
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (authLoading) return;
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
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (rolesLoading) return;

    const nextCurrentRole = ROLE_PRIORITY.find((role) => roles.includes(role)) ?? 'viewer';
    const nextEditableRole = SELF_SERVICE_ROLES.find((role) => roles.includes(role)) ?? 'viewer';

    setCurrentRole(nextCurrentRole);
    setCurrentEditableRole(nextEditableRole);
    setNewRole(nextEditableRole);
  }, [roles, rolesLoading]);

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

  const toggleProfile = async (role: 'organizer' | 'teacher' | 'artist', on: boolean) => {
    if (!user) return;
    setUpdatingRole(true);
    try {
      const { error } = on
        ? await supabase.from('user_roles').insert({ user_id: user.id, role })
        : await supabase.from('user_roles').delete().eq('user_id', user.id).eq('role', role);
      if (error) throw error;
      await refetchRoles();
      toast.success(on ? `${role[0].toUpperCase() + role.slice(1)} profile added` : 'Profile removed');
      if (on && role === 'artist') {
        toast.info('Create your artist profile?', {
          action: { label: 'Create Profile', onClick: () => navigate('/create-artist-profile') },
        });
      }
    } catch (error: any) {
      toast.error('Could not update profiles: ' + error.message);
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!user || newRole === currentEditableRole) return;

    setUpdatingRole(true);
    try {
      const { data: roleRows, error: fetchError } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const editableRoleRow = roleRows?.find((roleRow) => roleRow.role !== 'admin');

      if (editableRoleRow) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('id', editableRoleRow.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: newRole });

        if (error) throw error;
      }

      await refetchRoles();
      setCurrentRole(newRole);
      setCurrentEditableRole(newRole);
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

  if (loading || rolesLoading) {
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

          {/* Profiles Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your profiles</CardTitle>
              <CardDescription>
                Everyone can attend events and classes. Turn on extra profiles if you also host — you can then switch modes at the top right.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Attendee</p>
                  <p className="text-xs text-muted-foreground">Book events and classes — always on</p>
                </div>
                <Switch checked disabled aria-label="Attendee" />
              </div>
              {([
                { r: 'organizer', label: 'Organizer', desc: 'Create and manage events', Icon: Calendar },
                { r: 'teacher', label: 'Teacher', desc: 'List and manage music classes', Icon: GraduationCap },
                { r: 'artist', label: 'Artist', desc: 'Showcase your music and performances', Icon: Music },
              ] as const).map(({ r, label, desc, Icon }) => (
                <div key={r} className="flex items-center gap-3 rounded-lg border p-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={roles.includes(r)}
                    disabled={updatingRole}
                    onCheckedChange={(on) => toggleProfile(r, on)}
                    aria-label={label}
                  />
                </div>
              ))}
              {roles.includes('admin') && (
                <p className="text-xs text-muted-foreground">You also have admin access.</p>
              )}
            </CardContent>
          </Card>

          {/* Payments (organizers, artists & teachers) */}
          {roles.some((r) => ['organizer', 'teacher', 'artist', 'admin'].includes(r)) && (
            <>
              <PaymentMethodsEditor />
              <PaymentSettings />
            </>
          )}


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

          {/* My Bookings — everyone's own ticket bookings */}
          {user && <MyBookings userId={user.id} />}
        </div>
      </div>
    </>
  );
}
