import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, AlertCircle, CheckCircle, Minus, Plus, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useOrganizerPayments } from '@/hooks/useOrganizerPayments';
import { useOrganizerPaymentMethods } from '@/hooks/useOrganizerPaymentMethods';

type PaymentMethodChoice = 'card' | 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'cash' | 'direct';

const METHOD_LABELS: Record<string, string> = {
  venmo: 'Venmo',
  cashapp: 'Cash App',
  zelle: 'Zelle',
  paypal: 'PayPal',
  cash: 'Cash',
  direct: 'Direct',
};

interface PriceTier {
  id: string;
  name: string;
  price: string;
  quantity: string;
  endDate?: string;
}

interface BookingModalProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingModal({ event, open, onOpenChange }: BookingModalProps) {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [totalBookings, setTotalBookings] = useState(0);

  // Parse payment info from JSON
  const paymentInfo = event.payment_link ? JSON.parse(event.payment_link) : {};
  const hasPaymentInfo = paymentInfo.venmo || paymentInfo.cashapp || paymentInfo.zelle || paymentInfo.paypal;
  
  // Parse price tiers
  const priceTiers: PriceTier[] = event.price_tiers && Array.isArray(event.price_tiers) 
    ? event.price_tiers 
    : [];
  
  // Check if event has capacity limit
  const hasCapacity = event.ticket_capacity && event.ticket_capacity > 0;
  const remainingTickets = hasCapacity ? event.ticket_capacity - totalBookings : null;
  const isSoldOut = hasCapacity && remainingTickets !== null && remainingTickets <= 0;

  // Get active price (from tier or base price)
  const getActivePrice = () => {
    if (selectedTier && priceTiers.length > 0) {
      const tier = priceTiers.find(t => t.id === selectedTier);
      if (tier) return parseFloat(tier.price) || 0;
    }
    return event.price || 0;
  };

  const activePrice = getActivePrice();
  const isFreeEvent = activePrice === 0;
  const totalAmount = activePrice * ticketCount;
  
  // Check if event is in the past
  const isPastEvent = new Date(`${event.date}T${event.time}`) < new Date();

  // Card checkout is available when the organizer has finished Stripe setup
  const { chargesEnabled } = useOrganizerPayments(event.user_id);
  const { methods: organizerMethods } = useOrganizerPaymentMethods(event.user_id);

  const handles: Record<string, string> = {
    venmo: paymentInfo.venmo || organizerMethods?.venmo || '',
    cashapp: paymentInfo.cashapp || organizerMethods?.cashapp || '',
    zelle: paymentInfo.zelle || organizerMethods?.zelle || '',
    paypal: paymentInfo.paypal || organizerMethods?.paypal || '',
  };

  const paymentOptions: { value: PaymentMethodChoice; label: string; hint: string }[] = [];
  if (!isFreeEvent) {
    if (chargesEnabled && organizerMethods?.accept_card !== false) {
      paymentOptions.push({
        value: 'card',
        label: 'Card, Apple Pay or Google Pay',
        hint: 'Pay securely online — confirmed instantly',
      });
    }
    (['venmo', 'cashapp', 'zelle', 'paypal'] as const).forEach((key) => {
      if (handles[key]) {
        paymentOptions.push({
          value: key,
          label: METHOD_LABELS[key],
          hint: 'Send payment, upload proof — organizer confirms by email or at the door',
        });
      }
    });
    if (organizerMethods?.accept_cash) {
      paymentOptions.push({ value: 'cash', label: 'Cash at the door', hint: 'Reserve now — confirmed when you pay at the door' });
    }
    if (paymentOptions.length === 0) {
      paymentOptions.push({
        value: 'direct',
        label: 'Pay the organizer directly',
        hint: 'Upload proof of your payment',
      });
    }
  }

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodChoice | null>(null);
  const firstOption = paymentOptions[0]?.value;
  useEffect(() => {
    if (isFreeEvent) {
      setSelectedMethod(null);
      return;
    }
    setSelectedMethod((prev) => (prev && paymentOptions.some((o) => o.value === prev) ? prev : firstOption ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstOption, isFreeEvent, paymentOptions.length]);

  const useCardCheckout = selectedMethod === 'card';
  const needsProof = !isFreeEvent && !!selectedMethod && selectedMethod !== 'card' && selectedMethod !== 'cash';

  const handleCardCheckout = async () => {
    if (!user || !session) {
      toast.error('Please sign in to buy tickets', {
        action: { label: 'Sign In', onClick: () => navigate('/login') },
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { kind: 'event', id: event.id, quantity: ticketCount, tier_id: selectedTier, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Checkout unavailable');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Could not start checkout');
      setLoading(false);
    }
  };


  // Fetch user profile and total bookings
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !open) return;
      
      // Fetch profile
      const authEmail = user.email || '';
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      const email = authEmail || data?.email || '';
      const fullName = data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
      setUserProfile({ full_name: fullName, email });

      // Fetch total bookings for this event (for capacity check)
      if (hasCapacity) {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .neq('status', 'cancelled');
        setTotalBookings(count || 0);
      }
    };

    if (open) {
      fetchData();
      setTicketCount(1);
      setProofFile(null);
      // Default to first tier if available
      if (priceTiers.length > 0) {
        setSelectedTier(priceTiers[0].id);
      } else {
        setSelectedTier(null);
      }
    }
  }, [user, open, event.id, hasCapacity]);

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setProofFile(file);
    }
  };

  const handleBooking = async () => {
    if (isPastEvent) {
      toast.error('This event has already passed');
      onOpenChange(false);
      return;
    }

    if (isSoldOut) {
      toast.error('This event is sold out');
      onOpenChange(false);
      return;
    }

    // Check if booking would exceed capacity
    if (hasCapacity && remainingTickets !== null && ticketCount > remainingTickets) {
      toast.error(`Only ${remainingTickets} tickets remaining`);
      return;
    }
    
    if (!user || !session) {
      toast.error('Please sign in to book this event', {
        action: {
          label: 'Sign In',
          onClick: () => navigate('/login')
        }
      });
      onOpenChange(false);
      return;
    }

    if (!userProfile?.full_name || !userProfile?.email) {
      toast.error('Please complete your profile with name and email in Account Settings');
      return;
    }

    // Only direct transfers need proof of payment
    if (needsProof && !proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    setLoading(true);

    try {
      let proofPath: string | null = null;

      // Upload proof of payment for paid events
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user.id}/${event.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;
        proofPath = fileName;
      }

      // Create bookings for each ticket
      const selectedTierData = selectedTier ? priceTiers.find(t => t.id === selectedTier) : null;
      const bookingsToInsert = Array.from({ length: ticketCount }, () => ({
        event_id: event.id,
        user_id: user.id,
        attendee_name: userProfile.full_name,
        attendee_email: userProfile.email,
        amount: activePrice,
        payment_method: isFreeEvent ? 'free' : selectedMethod || 'direct',
        proof_of_payment_url: proofPath,
        status: isFreeEvent ? 'confirmed' : 'pending'
      }));

      const { data: insertedBookings, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingsToInsert)
        .select('id');

      if (bookingError) throw bookingError;

      // Send confirmation email for free events (auto-confirmed)
      if (isFreeEvent && insertedBookings?.[0]?.id) {
        try {
          await supabase.functions.invoke('send-booking-email', {
            body: { bookingId: insertedBookings[0].id }
          });
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
          // Don't fail the booking if email fails
        }
      }

      // Create Google Calendar link
      const eventDate = new Date(`${event.date}T${event.time}`);
      const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
      
      const formatDateForGoogle = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDateForGoogle(eventDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(`Booking for ${event.title} (${ticketCount} ticket${ticketCount > 1 ? 's' : ''})`)}&location=${encodeURIComponent(event.location_name || '')}`;

      const ticketText = ticketCount > 1 ? `${ticketCount} tickets` : '1 ticket';
      const successMessage = isFreeEvent
        ? `${ticketText} confirmed! 🎉`
        : selectedMethod === 'cash'
          ? `${ticketText} reserved! Pay cash at the door to confirm.`
          : `${ticketText} submitted! The organizer will confirm your payment by email or at the door.`;

      toast.success(
        <div>
          <p className="font-semibold mb-2">{successMessage}</p>
          <a 
            href={calendarUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm font-medium inline-flex items-center gap-1"
          >
            Add to Google Calendar →
          </a>
        </div>,
        { duration: 8000 }
      );

      onOpenChange(false);
      setProofFile(null);
      setTicketCount(1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Event: {event.title}</DialogTitle>
          <DialogDescription>
            {isSoldOut 
              ? 'This event is sold out'
              : isPastEvent 
                ? 'This event has already passed' 
                : isFreeEvent 
                  ? 'Confirm your free registration' 
                  : 'Complete your booking for this event'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sold Out Notice */}
          {isSoldOut && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                This event has sold out. No more tickets are available.
              </AlertDescription>
            </Alert>
          )}

          {/* Remaining Tickets Notice */}
          {!isSoldOut && hasCapacity && remainingTickets !== null && remainingTickets <= 10 && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Only {remainingTickets} ticket{remainingTickets !== 1 ? 's' : ''} remaining!
              </AlertDescription>
            </Alert>
          )}

          {/* Auto-filled User Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Booking as:</p>
            <div className="space-y-1">
              <p className="font-semibold">{userProfile?.full_name || 'Loading...'}</p>
              <p className="text-sm text-muted-foreground">{userProfile?.email || 'Loading...'}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Update your info in <button className="text-primary hover:underline" onClick={() => { onOpenChange(false); navigate('/settings'); }}>Account Settings</button>
            </p>
          </div>

          {/* Price Tiers Selection */}
          {priceTiers.length > 0 && !isSoldOut && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Ticket Type</Label>
              <RadioGroup value={selectedTier || ''} onValueChange={setSelectedTier}>
                {priceTiers.map((tier) => {
                  const tierPrice = parseFloat(tier.price) || 0;
                  const isExpired = tier.endDate && new Date(tier.endDate) < new Date();
                  
                  return (
                    <div
                      key={tier.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedTier === tier.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      } ${isExpired ? 'opacity-50' : 'cursor-pointer'}`}
                      onClick={() => !isExpired && setSelectedTier(tier.id)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={tier.id} disabled={isExpired} />
                        <div>
                          <p className="font-medium text-sm">{tier.name}</p>
                          {tier.endDate && (
                            <p className="text-xs text-muted-foreground">
                              {isExpired ? 'Expired' : `Until ${new Date(tier.endDate).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold">
                        {tierPrice === 0 ? 'Free' : `$${tierPrice.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Ticket Quantity */}
          {!isSoldOut && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Number of Tickets</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    disabled={ticketCount <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-semibold w-8 text-center">{ticketCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTicketCount(Math.min(remainingTickets ?? 10, ticketCount + 1))}
                    disabled={ticketCount >= (remainingTickets ?? 10)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Price Info */}
          {!isSoldOut && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {isFreeEvent ? 'Event Price' : `Total (${ticketCount} × $${activePrice.toFixed(2)})`}
                </span>
                <span className="text-lg font-bold">
                  {isFreeEvent ? (
                    <span className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      Free Entry
                    </span>
                  ) : (
                    `$${totalAmount.toFixed(2)}`
                  )}
                </span>
              </div>
            </div>
          )}

          {/* How would you like to pay? */}
          {!isSoldOut && !isFreeEvent && paymentOptions.length > 0 && (
            <div className="space-y-3">
              <Label>How would you like to pay?</Label>
              <RadioGroup
                value={selectedMethod ?? undefined}
                onValueChange={(value) => setSelectedMethod(value as PaymentMethodChoice)}
                className="space-y-2"
              >
                {paymentOptions.map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`pay-${option.value}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedMethod === option.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={`pay-${option.value}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.hint}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              {selectedMethod && selectedMethod !== 'card' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {selectedMethod === 'cash' ? (
                      <p className="text-sm">
                        Reserve your spot now and bring <span className="font-semibold">${totalAmount.toFixed(2)}</span>{' '}
                        in cash to the venue. The organizer confirms you on arrival.
                      </p>
                    ) : (
                      <>
                        <p className="mb-2 font-medium">Send ${totalAmount.toFixed(2)} to:</p>
                        {handles[selectedMethod] ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="w-20">
                              {METHOD_LABELS[selectedMethod]}
                            </Badge>
                            <span className="font-mono font-semibold">{handles[selectedMethod]}</span>
                          </div>
                        ) : (
                          <p className="text-sm">the organizer, using the details they shared with you.</p>
                        )}
                        <p className="mt-2 text-xs">
                          After sending payment, upload your proof below. The organizer will confirm your tickets
                          by email or at the door.
                        </p>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Proof of payment — only when paying the organizer directly */}
          {!isSoldOut && needsProof && (
            <div className="space-y-2">
              <Label htmlFor="proof">Proof of Payment *</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="proof"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleProofUpload}
                  className="cursor-pointer flex-1"
                />
                {proofFile && (
                  <div className="shrink-0">
                    {proofFile.type.startsWith('image/') ? (
                      <img
                        src={URL.createObjectURL(proofFile)}
                        alt="Payment proof preview"
                        className="h-12 w-12 object-cover rounded-md border"
                      />
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Upload className="h-3 w-3" />
                        PDF
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a screenshot or receipt (max 5MB)
              </p>
            </div>
          )}

          {useCardCheckout ? (
            <div className="space-y-2">
              <Button
                onClick={handleCardCheckout}
                disabled={loading || isPastEvent || isSoldOut}
                className="w-full"
              >
                {isSoldOut
                  ? 'Sold Out'
                  : isPastEvent
                    ? 'Event Has Passed'
                    : loading
                      ? 'Redirecting to secure checkout...'
                      : `Pay by Card · $${totalAmount.toFixed(2)}`}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Card, Apple Pay and Google Pay are handled securely by Stripe. Your tickets are confirmed once
                payment succeeds.
              </p>
            </div>
          ) : (
            <Button
              onClick={handleBooking}
              disabled={loading || isPastEvent || isSoldOut || (needsProof && !proofFile) || !userProfile}
              className="w-full"
            >
              {isSoldOut
                ? 'Sold Out'
                : isPastEvent
                  ? 'Event Has Passed'
                  : loading
                    ? 'Processing...'
                    : isFreeEvent
                      ? `Confirm ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}`
                      : selectedMethod === 'cash'
                        ? `Reserve ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''} · Pay cash at the door`
                        : `Submit Booking (${ticketCount} Ticket${ticketCount > 1 ? 's' : ''})`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
