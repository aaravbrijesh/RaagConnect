import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Moon, Sun, Monitor } from 'lucide-react';
import Nav from '@/components/Nav';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function Settings() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();

  useEffect(() => {
    if (!session) {
      navigate('/login');
    }
  }, [session, navigate]);

  if (!session || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your app experience</p>
          </div>
        </div>

        <div className="space-y-6">
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
                  onValueChange={(value: 'light' | 'dark' | 'system') => {
                    updateSetting('theme', value);
                    // Apply theme
                    if (value === 'system') {
                      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      document.documentElement.classList.toggle('dark', isDark);
                    } else {
                      document.documentElement.classList.toggle('dark', value === 'dark');
                    }
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
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="system" id="system" />
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="system" className="flex-1 cursor-pointer">
                      System
                    </Label>
                  </div>
                </RadioGroup>
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
        </div>
      </div>
    </div>
  );
}
