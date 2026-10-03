import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, GraduationCap, Loader2, Search } from 'lucide-react';
import { recordPath } from '@/lib/slug';

interface EventBooking {
  id: string;
  status: string;
  event: { id: string; slug: string | null; title: string; date: string; time: string; location_name: string | null };
}
interface ClassBooking {
  id: string;
  status: string;
  booking_date: string;
  start_time: string;
  classes: { id: string; slug: string | null; title: string } | null;
}

export default function AttendeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventBooking[]>([]);
  const [classes, setClasses] = useState<ClassBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    (async () => {
      const [eb, cb] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, status, events(id, slug, title, date, time, location_name)')
          .eq('user_id', user.id)
          .not('status', 'in', '(cancelled,rejected)'),
        supabase
          .from('class_bookings')
          .select('id, status, booking_date, start_time, classes(id, slug, title)')
          .eq('user_id', user.id)
          .gte('booking_date', today)
          .not('status', 'in', '(cancelled,rejected)')
          .order('booking_date'),
      ]);
      setEvents(
        ((eb.data as any[]) || [])
          .filter((b) => b.events && b.events.date >= today)
          .map((b) => ({ id: b.id, status: b.status, event: b.events }))
          .sort((a, b) => a.event.date.localeCompare(b.event.date))
      );
      setClasses(((cb.data as any[]) || []) as ClassBooking[]);
      setLoading(false);
    })();
  }, [user]);

  const fmt = (d: string, t: string) =>
    new Date(`${d}T${t}`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Your tickets & classes</h1>
          <p className="text-muted-foreground">Everything you're attending, in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/classes')} className="gap-2">
            <GraduationCap className="h-4 w-4" /> Find classes
          </Button>
          <Button onClick={() => navigate('/events')} className="gap-2">
            <Search className="h-4 w-4" /> Find events
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
            <CardHeader><CardTitle className="text-xl">Upcoming events</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-muted-foreground">You haven't booked any upcoming events.</p>
                  <Button className="mt-4" onClick={() => navigate('/events')}>Browse events</Button>
                </div>
              ) : (
                events.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{b.event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {fmt(b.event.date, b.event.time)}
                        {b.event.location_name ? ` · ${b.event.location_name}` : ''}
                      </p>
                    </div>
                    <Badge variant={b.status === 'confirmed' ? 'default' : 'secondary'} className="capitalize">{b.status}</Badge>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/events/${recordPath(b.event)}`)}>View</Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-xl">Upcoming classes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {classes.length === 0 ? (
                <p className="text-muted-foreground">No upcoming class sessions.</p>
              ) : (
                classes.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.classes?.title ?? 'Class'}</p>
                      <p className="text-sm text-muted-foreground">{fmt(c.booking_date, c.start_time)}</p>
                    </div>
                    <Badge variant={c.status === 'confirmed' ? 'default' : 'secondary'} className="capitalize">{c.status}</Badge>
                    {c.classes && (
                      <Button variant="outline" size="sm" onClick={() => navigate(`/classes/${recordPath(c.classes!)}`)}>View</Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
