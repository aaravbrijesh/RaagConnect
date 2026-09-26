import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Form {
  accept_card: boolean;
  accept_cash: boolean;
  venmo: string;
  cashapp: string;
  zelle: string;
  paypal: string;
}

const emptyForm: Form = {
  accept_card: true,
  accept_cash: false,
  venmo: '',
  cashapp: '',
  zelle: '',
  paypal: '',
};

export default function PaymentMethodsEditor() {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('organizer_payment_methods')
      .select('accept_card, accept_cash, venmo, cashapp, zelle, paypal')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            accept_card: data.accept_card,
            accept_cash: data.accept_cash,
            venmo: data.venmo || '',
            cashapp: data.cashapp || '',
            zelle: data.zelle || '',
            paypal: data.paypal || '',
          });
        }
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('organizer_payment_methods').upsert(
      {
        user_id: user.id,
        accept_card: form.accept_card,
        accept_cash: form.accept_cash,
        venmo: form.venmo.trim() || null,
        cashapp: form.cashapp.trim() || null,
        zelle: form.zelle.trim() || null,
        paypal: form.paypal.trim() || null,
      },
      { onConflict: 'user_id' },
    );
    setSaving(false);
    if (error) {
      toast.error('Could not save your payment options');
      return;
    }
    toast.success('Payment options saved');
  };

  const field = (key: keyof Form, label: string, placeholder: string) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={form[key] as string}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payment Methods
        </CardTitle>
        <CardDescription>
          Choose how attendees can pay you. Leave everything blank if your events are free — this is optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your options…
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="accept_card" className="text-sm font-medium">
                  Card, Apple Pay &amp; Google Pay
                </Label>
                <p className="text-xs text-muted-foreground">
                  Instant online payment. Requires finishing card payment setup below.
                </p>
              </div>
              <Switch
                id="accept_card"
                checked={form.accept_card}
                onCheckedChange={(checked) => setForm({ ...form, accept_card: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="accept_cash" className="text-sm font-medium">
                  Cash at the door
                </Label>
                <p className="text-xs text-muted-foreground">Attendees reserve now and pay you in person.</p>
              </div>
              <Switch
                id="accept_cash"
                checked={form.accept_cash}
                onCheckedChange={(checked) => setForm({ ...form, accept_cash: checked })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {field('venmo', 'Venmo', '@username')}
              {field('cashapp', 'Cash App', '$cashtag')}
              {field('zelle', 'Zelle', 'email@example.com or phone')}
              {field('paypal', 'PayPal', '@username')}
            </div>

            <p className="text-xs text-muted-foreground">
              Venmo, Cash App, Zelle, PayPal and cash are paid directly to you — attendees upload proof and you
              approve their booking.
            </p>

            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save payment options
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
