import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, CreditCard, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

type Status = 'not_configured' | 'incomplete' | 'action_required' | 'enabled';

interface PaymentRow {
  id: string;
  created_at: string;
  gross_amount: number;
  platform_fee: number;
  currency: string;
  payment_status: string;
  refund_status: string;
  refunded_amount: number;
  quantity: number;
  event_id: string | null;
  class_id: string | null;
}

const money = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

const STATUS_LABEL: Record<Status, string> = {
  not_configured: 'Payments not configured',
  incomplete: 'Setup incomplete',
  action_required: 'Action required',
  enabled: 'Payments enabled',
};

export default function PaymentSettings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<Status>('not_configured');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [feePercent, setFeePercent] = useState(5);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: statusData }, { data: paymentRows }, { data: settings }] = await Promise.all([
        supabase.functions.invoke('stripe-connect-status'),
        supabase
          .from('payments')
          .select('id, created_at, gross_amount, platform_fee, currency, payment_status, refund_status, refunded_amount, quantity, event_id, class_id')
          .eq('organizer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(25),
        supabase.from('platform_settings').select('platform_fee_percent').maybeSingle(),
      ]);

      if (statusData?.status) setStatus(statusData.status as Status);
      setPayments((paymentRows as PaymentRow[]) || []);
      if (settings?.platform_fee_percent != null) setFeePercent(Number(settings.platform_fee_percent));
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get('payments')) {
      searchParams.delete('payments');
      setSearchParams(searchParams, { replace: true });
      refresh();
    }
  }, [searchParams, setSearchParams, refresh]);

  const startOnboarding = async () => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Could not start payment setup');
      setWorking(false);
    }
  };

  const paid = payments.filter((p) => p.payment_status === 'paid');
  const totalSales = paid.reduce((sum, p) => sum + p.gross_amount, 0);
  const totalFees = paid.reduce((sum, p) => sum + p.platform_fee, 0);
  const proceeds = totalSales - totalFees - paid.reduce((s, p) => s + p.refunded_amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Accept Payments
        </CardTitle>
        <CardDescription>
          Take card payments for your paid events and classes. RaagConnect keeps a {feePercent}% platform fee and the
          rest is paid out to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your payment setup…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge
                variant={status === 'enabled' ? 'default' : status === 'not_configured' ? 'secondary' : 'outline'}
                className="gap-1.5 py-1.5 px-3"
              >
                {status === 'enabled' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : status !== 'not_configured' ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : null}
                {STATUS_LABEL[status]}
              </Badge>

              <Button onClick={startOnboarding} disabled={working} className="gap-2">
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {status === 'not_configured' ? 'Set Up Payments' : status === 'enabled' ? 'Update payment details' : 'Finish setup'}
              </Button>
            </div>

            {status !== 'enabled' && (
              <p className="text-sm text-muted-foreground">
                Your paid listings cannot take card payments until this setup is complete. Identity and bank details are
                collected and stored by Stripe, never by RaagConnect.
              </p>
            )}

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total sales</p>
                <p className="text-xl font-semibold">{money(totalSales)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">RaagConnect fees</p>
                <p className="text-xl font-semibold">{money(totalFees)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Your proceeds</p>
                <p className="text-xl font-semibold">{money(proceeds)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Recent transactions</p>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No card payments yet.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {money(p.gross_amount, p.currency)}
                          <span className="text-muted-foreground font-normal"> · {p.quantity} × {p.event_id ? 'ticket' : 'session'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString()} · fee {money(p.platform_fee, p.currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={p.payment_status === 'paid' ? 'default' : 'secondary'}>{p.payment_status}</Badge>
                        {p.refund_status !== 'none' && <Badge variant="outline">{p.refund_status}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
