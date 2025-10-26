import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BookingModalProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BookingModal({ event, open, onOpenChange }: BookingModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });

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

  const handleDirectPaymentBooking = async () => {
    if (!user) {
      toast.error('Please sign in to book');
      return;
    }

    if (!formData.name || !formData.email) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    setLoading(true);

    try {
      // Upload proof of payment
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${user.id}/${event.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, proofFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      // Create booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          event_id: event.id,
          user_id: user.id,
          attendee_name: formData.name,
          attendee_email: formData.email,
          amount: event.price || 0,
          payment_method: 'direct',
          proof_of_payment_url: publicUrl,
          status: 'pending'
        });

      if (bookingError) throw bookingError;

      toast.success('Booking submitted! Awaiting organizer confirmation.');
      onOpenChange(false);
      setFormData({ name: '', email: '' });
      setProofFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit booking');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to book');
      return;
    }

    if (!formData.name || !formData.email) {
      toast.error('Please fill in all fields');
      return;
    }

    toast.info('Stripe integration coming soon!');
    // TODO: Implement Stripe checkout
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Event: {event.title}</DialogTitle>
          <DialogDescription>
            Complete your booking for this event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Event Price</span>
              <span className="text-lg font-bold">${event.price || 0}</span>
            </div>
          </div>

          {event.use_stripe_checkout ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You will be redirected to Stripe to complete your payment securely.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={handleStripeCheckout} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Pay with Stripe'}
              </Button>
            </>
          ) : (
            <>
              {event.payment_link && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p>Please send payment to the organizer first:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(event.payment_link, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Payment Link
                    </Button>
                    <p className="text-xs">After payment, upload your proof below.</p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="proof">Proof of Payment</Label>
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

              <Button 
                onClick={handleDirectPaymentBooking} 
                disabled={loading || !proofFile}
                className="w-full"
              >
                {loading ? 'Submitting...' : 'Submit Booking'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
