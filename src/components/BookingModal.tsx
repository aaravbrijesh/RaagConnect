import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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

  // Parse payment info from JSON
  const paymentInfo = event.payment_link ? JSON.parse(event.payment_link) : {};
  const hasPaymentInfo = paymentInfo.venmo || paymentInfo.cashapp || paymentInfo.zelle || paymentInfo.paypal;
  const isFreeEvent = !event.price || event.price === 0;
  const totalAmount = (event.price || 0) * ticketCount;
  
  // Check if event is in the past
  const isPastEvent = new Date(`${event.date}T${event.time}`) < new Date();

  // Fetch user profile for auto-fill - prioritize auth email for Google OAuth users
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      // For Google OAuth users, user.email is always available and verified
      const authEmail = user.email || '';
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      // Use auth email (from Google) first, then profile email as fallback
      const email = authEmail || data?.email || '';
      const fullName = data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '';

      setUserProfile({
        full_name: fullName,
        email: email
      });
    };

    if (open) {
      fetchProfile();
      setTicketCount(1);
      setProofFile(null);
    }
  }, [user, open]);

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

    // For paid events, require proof of payment
    if (!isFreeEvent && !proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    setLoading(true);

    try {
      let proofPath: string | null = null;

      // Upload proof of payment for paid events
      if (!isFreeEvent && proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `${user.id}/${event.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;
        proofPath = fileName;
      }

      // Create bookings for each ticket
      const bookingsToInsert = Array.from({ length: ticketCount }, () => ({
        event_id: event.id,
        user_id: user.id,
        attendee_name: userProfile.full_name,
        attendee_email: userProfile.email,
        amount: event.price || 0,
        payment_method: isFreeEvent ? 'free' : 'direct',
        proof_of_payment_url: proofPath,
        status: isFreeEvent ? 'confirmed' : 'pending'
      }));

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingsToInsert);

      if (bookingError) throw bookingError;

      // Send confirmation email for free events (auto-confirmed)
      if (isFreeEvent) {
        try {
          await supabase.functions.invoke('send-booking-email', {
            body: {
              to: userProfile.email,
              attendeeName: userProfile.full_name,
              eventTitle: event.title,
              eventDate: new Date(event.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }),
              eventTime: event.time,
              eventLocation: event.location_name || '',
              status: 'confirmed'
            }
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
        : `${ticketText} submitted! Awaiting organizer confirmation.`;

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Event: {event.title}</DialogTitle>
          <DialogDescription>
            {isPastEvent 
              ? 'This event has already passed' 
              : isFreeEvent 
                ? 'Confirm your free registration' 
                : 'Complete your booking for this event'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Auto-filled User Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium">Booking as:</p>
            <div className="space-y-1">
              <p className="font-semibold">{userProfile?.full_name || 'Loading...'}</p>
              <p className="text-sm text-muted-foreground">{userProfile?.email || 'Loading...'}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Update your info in <button className="text-primary hover:underline" onClick={() => { onOpenChange(false); navigate('/account'); }}>Account Settings</button>
            </p>
          </div>

          {/* Ticket Quantity */}
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
                  onClick={() => setTicketCount(Math.min(10, ticketCount + 1))}
                  disabled={ticketCount >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Price Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                {isFreeEvent ? 'Event Price' : `Total (${ticketCount} × $${event.price})`}
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

          {/* Payment info for paid events */}
          {!isFreeEvent && hasPaymentInfo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Send ${totalAmount.toFixed(2)} to:</p>
                <div className="space-y-1 text-sm">
                  {paymentInfo.venmo && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-20">Venmo</Badge>
                      <span className="font-mono font-semibold">{paymentInfo.venmo}</span>
                    </div>
                  )}
                  {paymentInfo.cashapp && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-20">Cash App</Badge>
                      <span className="font-mono font-semibold">{paymentInfo.cashapp}</span>
                    </div>
                  )}
                  {paymentInfo.zelle && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-20">Zelle</Badge>
                      <span className="font-mono font-semibold">{paymentInfo.zelle}</span>
                    </div>
                  )}
                  {paymentInfo.paypal && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-20">PayPal</Badge>
                      <span className="font-mono font-semibold">{paymentInfo.paypal}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs mt-2">After sending payment, upload your proof below.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Proof of payment for paid events */}
          {!isFreeEvent && (
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

          <Button 
            onClick={handleBooking} 
            disabled={loading || isPastEvent || (!isFreeEvent && !proofFile) || !userProfile}
            className="w-full"
          >
            {isPastEvent 
              ? 'Event Has Passed' 
              : loading 
                ? 'Processing...' 
                : isFreeEvent 
                  ? `Confirm ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}` 
                  : `Submit Booking (${ticketCount} Ticket${ticketCount > 1 ? 's' : ''})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
