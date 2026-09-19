import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Nav from '@/components/Nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const money = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('session_id');
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, events(title, date, time, location_name, slug, id), classes(title, slug, id)')
        .eq('stripe_checkout_session_id', sessionId)
        .maybeSingle();

      if (cancelled) return;
      if (data) setPayment(data);

      attempts += 1;
      if ((!data || data.payment_status !== 'paid') && attempts < 6) {
        setTimeout(poll, 1500);
      } else {
        setLoading(false);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const listing = payment?.events || payment?.classes;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 py-16 max-w-xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-7 w-7 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">Payment successful</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {listing && (
              <div className="space-y-1">
                <p className="text-lg font-semibold">{listing.title}</p>
                {payment.events?.date && (
                  <p className="text-sm text-muted-foreground">
                    {new Date(`${payment.events.date}T${payment.events.time}`).toLocaleString()}
                    {payment.events.location_name ? ` · ${payment.events.location_name}` : ''}
                  </p>
                )}
              </div>
            )}

            {payment && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
                <p>
                  {payment.quantity} × {payment.event_id ? 'ticket' : 'session'} ·{' '}
                  <span className="font-semibold">{money(payment.gross_amount, payment.currency)}</span>
                </p>
                <p className="text-muted-foreground">
                  {payment.payment_status === 'paid'
                    ? 'Your registration is confirmed.'
                    : 'Your payment is being confirmed — this page will update shortly.'}
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate('/settings')}>
                View my bookings
              </Button>
              <Button onClick={() => navigate(payment?.class_id ? '/classes' : '/events')}>
                Keep browsing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
