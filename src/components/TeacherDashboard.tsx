import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, GraduationCap, Users, CreditCard, ArrowRight, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { recordPath } from '@/lib/slug';
import { useOrganizerPayments } from '@/hooks/useOrganizerPayments';
import { useOrganizerPaymentMethods, hasAnyManualMethod } from '@/hooks/useOrganizerPaymentMethods';

interface ClassRow {
  id: string;
  slug: string | null;
  title: string;
  genre: string;
  skill_level: string;
  class_mode: string;
  price: number | null;
  image_url: string | null;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState(0);
  const [loading, setLoading] = useState(true);
  const { chargesEnabled } = useOrganizerPayments(user?.id);
  const { methods } = useOrganizerPaymentMethods(user?.id);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, slug, title, genre, skill_level, class_mode, price, image_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const rows = (data as ClassRow[]) || [];
      setClasses(rows);

      if (rows.length) {
        const { count } = await supabase
          .from('class_bookings')
          .select('id', { count: 'exact', head: true })
          .in('class_id', rows.map((c) => c.id))
          .gte('booking_date', new Date().toISOString().split('T')[0])
          .neq('status', 'cancelled');
        setUpcomingBookings(count || 0);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const paymentsReady = chargesEnabled || hasAnyManualMethod(methods);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Your teaching</h1>
            <p className="text-muted-foreground">Manage your classes and student bookings.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/settings')} className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              Settings
            </Button>
            <Button onClick={() => navigate('/classes/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { label: 'Classes offered', value: classes.length, icon: GraduationCap },
            { label: 'Upcoming student bookings', value: upcomingBookings, icon: Users },
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

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">Your classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : classes.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">You haven't listed a class yet.</p>
                <Button className="mt-4 gap-2" onClick={() => navigate('/classes/create')}>
                  <Plus className="h-4 w-4" /> Create your first class
                </Button>
              </div>
            ) : (
              classes.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.title} className="h-14 w-14 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-secondary">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.genre} · {c.skill_level} · {c.class_mode}
                    </p>
                  </div>
                  {c.price ? <Badge variant="secondary">${c.price}</Badge> : <Badge variant="outline">Free</Badge>}
                  <Button variant="outline" size="sm" onClick={() => navigate(`/classes/${recordPath(c)}`)}>
                    Manage
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
