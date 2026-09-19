import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Whether a given organizer/teacher can currently accept card payments. */
export function useOrganizerPayments(organizerId?: string | null) {
  const [chargesEnabled, setChargesEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!organizerId) {
      setChargesEnabled(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('organizer_payments_public')
      .select('charges_enabled')
      .eq('user_id', organizerId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setChargesEnabled(!!data?.charges_enabled);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizerId]);

  return { chargesEnabled, loading };
}

/** Central platform fee, read from the database (never hard-coded in the UI). */
export function usePlatformFee() {
  const [feePercent, setFeePercent] = useState(5);
  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('platform_fee_percent')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.platform_fee_percent != null) setFeePercent(Number(data.platform_fee_percent));
      });
  }, []);
  return feePercent;
}
