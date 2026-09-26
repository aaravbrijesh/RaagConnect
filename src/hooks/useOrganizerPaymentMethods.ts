import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizerPaymentMethods {
  accept_card: boolean;
  accept_cash: boolean;
  venmo: string | null;
  cashapp: string | null;
  zelle: string | null;
  paypal: string | null;
}

export const emptyPaymentMethods: OrganizerPaymentMethods = {
  accept_card: true,
  accept_cash: false,
  venmo: null,
  cashapp: null,
  zelle: null,
  paypal: null,
};

/** Payment options an organizer/teacher has chosen to offer. */
export function useOrganizerPaymentMethods(organizerId?: string | null) {
  const [methods, setMethods] = useState<OrganizerPaymentMethods | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!organizerId) {
      setMethods(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('organizer_payment_methods')
      .select('accept_card, accept_cash, venmo, cashapp, zelle, paypal')
      .eq('user_id', organizerId)
      .maybeSingle();
    setMethods((data as OrganizerPaymentMethods) ?? null);
    setLoading(false);
  }, [organizerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { methods, loading, refresh };
}

export const hasAnyManualMethod = (m?: OrganizerPaymentMethods | null) =>
  !!m && (!!m.venmo || !!m.cashapp || !!m.zelle || !!m.paypal || m.accept_cash);
