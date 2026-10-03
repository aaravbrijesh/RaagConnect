import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Calendar,
  Users,
  Ticket,
  Settings as SettingsIcon,
  CreditCard,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { recordPath } from '@/lib/slug';
import { useOrganizerPayments } from '@/hooks/useOrganizerPayments';
import { useOrganizerPaymentMethods, hasAnyManualMethod } from '@/hooks/useOrganizerPaymentMethods';

interface EventRow {
  id: string;
  slug: string | null;
  title: string;
  date: string;
  time: string;
  location_name: string | null;
  image_url: string | null;
  price: number | null;
}

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [bookingCount, setBookingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { chargesEnabled } = useOrganizerPayments(user?.id);
  const { methods } = useOrganizerPaymentMethods(user?.id);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, slug, title, date, time, location_name, image_url, price')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      const rows = (data as EventRow[]) || [];
      setEvents(rows);

      if (rows.length) {
        const { count } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .in('event_id', rows.map((e) => e.id))
          .neq('status', 'cancelled');
        setBookingCount(count || 0);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((e) => e.date < today);

  const paymentsReady = chargesEnabled || hasAnyManualMethod(methods);

  const EventRowItem = ({ event }: { event: EventRow }) => (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4 hover:bg-muted/40 transition-colors">
      {event.image_url ? (
        <img src={event.image_url} alt={event.title} className="h-14 w-14 rounded-md object-cover" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-secondary">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{event.title}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(`${event.date}T${event.time}`).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
          {event.location_name ? ` · ${event.location_name}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {event.price ? <Badge variant="secondary">${event.price}</Badge> : <Badge variant="outline">Free</Badge>}
        <Button variant="outline" size="sm" onClick={() => navigate(`/events/${recordPath(event)}`)}>
          Manage
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your events</h1>
            <p className="text-muted-foreground">Everything you host, in one place.</p>
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

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Upcoming events', value: upcoming.length, icon: Calendar },
            { label: 'Past events', value: past.length, icon: Ticket },
            { label: 'Total bookings', value: bookingCount, icon: Users },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-5">
                <s.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="mt-10 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your events…
          </div>
        ) : (
          <>
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="text-xl">Upcoming events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcoming.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <p className="text-muted-foreground">You have no upcoming events yet.</p>
                    <Button className="mt-4 gap-2" onClick={() => navigate('/events/create')}>
                      <Plus className="h-4 w-4" /> Create your first event
                    </Button>
                  </div>
                ) : (
                  upcoming.map((e) => <EventRowItem key={e.id} event={e} />)
                )}
              </CardContent>
            </Card>


            {past.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-xl">Past events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {past.map((e) => (
                    <EventRowItem key={e.id} event={e} />
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
