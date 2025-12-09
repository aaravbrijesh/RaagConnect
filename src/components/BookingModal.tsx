import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
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

  // Parse payment info from JSON
  const paymentInfo = event.payment_link ? JSON.parse(event.payment_link) : {};
  const hasPaymentInfo = paymentInfo.venmo || paymentInfo.cashapp || paymentInfo.zelle || paymentInfo.paypal;
  const isFreeEvent = !event.price || event.price === 0;

  // Fetch user profile for auto-fill
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setUserProfile({
          full_name: data.full_name || '',
          email: data.email || user.email || ''
        });
      } else {
        setUserProfile({
          full_name: user.user_metadata?.full_name || '',
          email: user.email || ''
        });
      }
    };

    if (open) {
      fetchProfile();
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

      // Create booking with user profile data
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          event_id: event.id,
          user_id: user.id,
          attendee_name: userProfile.full_name,
          attendee_email: userProfile.email,
          amount: event.price || 0,
          payment_method: isFreeEvent ? 'free' : 'direct',
          proof_of_payment_url: proofPath,
          status: isFreeEvent ? 'confirmed' : 'pending'
        });

      if (bookingError) throw bookingError;

      // Create Google Calendar link
      const eventDate = new Date(`${event.date}T${event.time}`);
      const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
      
      const formatDateForGoogle = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDateForGoogle(eventDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(`Booking for ${event.title}`)}&location=${encodeURIComponent(event.location_name || '')}`;

      const successMessage = isFreeEvent 
        ? 'Booking confirmed! 🎉' 
        : 'Booking submitted! Awaiting organizer confirmation.';

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
            {isFreeEvent ? 'Confirm your free registration' : 'Complete your booking for this event'}
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

          {/* Price Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Event Price</span>
              <span className="text-lg font-bold">
                {isFreeEvent ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Free Entry
                  </span>
                ) : (
                  `$${event.price}`
                )}
              </span>
            </div>
          </div>

          {/* Payment info for paid events */}
          {!isFreeEvent && hasPaymentInfo && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Send payment to:</p>
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
              <Input
                id="proof"
                type="file"
                accept="image/*,.pdf"
                onChange={handleProofUpload}
                className="cursor-pointer"
              />
              {proofFile && (
                <Badge variant="secondary" className="gap-1">
                  <Upload className="h-3 w-3" />
                  {proofFile.name}
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">
                Upload a screenshot or receipt (max 5MB)
              </p>
            </div>
          )}

          <Button 
            onClick={handleBooking} 
            disabled={loading || (!isFreeEvent && !proofFile) || !userProfile}
            className="w-full"
          >
            {loading ? 'Processing...' : isFreeEvent ? 'Confirm Registration' : 'Submit Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
