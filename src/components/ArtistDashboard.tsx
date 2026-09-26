import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Calendar, Plus, Loader2, Settings as SettingsIcon, UserRound } from 'lucide-react';
import { recordPath } from '@/lib/slug';

interface ArtistRow {
  id: string;
  slug: string | null;
  name: string;
  genre: string;
  image_url: string | null;
  bio: string | null;
}

interface EventRow {
  id: string;
  slug: string | null;
  title: string;
  date: string;
  time: string;
  location_name: string | null;
}

export default function ArtistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<ArtistRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: artistData } = await supabase
        .from('artists')
        .select('id, slug, name, genre, image_url, bio')
        .eq('user_id', user.id)
        .maybeSingle();
      setArtist((artistData as ArtistRow) || null);

      const { data: eventData } = await supabase
        .from('events')
        .select('id, slug, title, date, time, location_name')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      setEvents((eventData as EventRow[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter((e) => e.date >= today);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your artist space</h1>
            <p className="text-muted-foreground">Your profile and the performances you host.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/settings')} className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              Settings
            </Button>
            <Button onClick={() => navigate('/events/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-xl">Your profile</CardTitle>
              </CardHeader>
              <CardContent>
                {artist ? (
                  <div className="flex flex-wrap items-center gap-4">
                    {artist.image_url ? (
                      <img src={artist.image_url} alt={artist.name} className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                        <UserRound className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{artist.name}</p>
                      <p className="text-sm text-muted-foreground">{artist.genre}</p>
                    </div>
                    <Button variant="outline" onClick={() => navigate(`/artists/${recordPath(artist)}`)}>
                      View profile
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Music className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                    <p className="text-muted-foreground">You haven't created your artist profile yet.</p>
                    <Button className="mt-4" onClick={() => navigate('/create-artist-profile')}>
                      Create artist profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-xl">Your upcoming performances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcoming.length === 0 ? (
                  <p className="text-muted-foreground">Nothing scheduled yet.</p>
                ) : (
                  upcoming.map((e) => (
                    <div
                      key={e.id}
                      className="flex flex-wrap items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(`${e.date}T${e.time}`).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          {e.location_name ? ` · ${e.location_name}` : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/events/${recordPath(e)}`)}>
                        Manage
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    </div>
  );
}
