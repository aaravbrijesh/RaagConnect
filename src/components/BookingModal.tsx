import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle } from 'lucide-react';
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

  // Parse payment info from JSON
  const paymentInfo = event.payment_link ? JSON.parse(event.payment_link) : {};
  const hasPaymentInfo = paymentInfo.venmo || paymentInfo.cashapp || paymentInfo.zelle || paymentInfo.paypal;

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

      // Create Google Calendar link
      const eventDate = new Date(`${event.date}T${event.time}`);
      const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
      
      const formatDateForGoogle = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDateForGoogle(eventDate)}/${formatDateForGoogle(endDate)}&details=${encodeURIComponent(`Booking confirmed for ${event.title}`)}&location=${encodeURIComponent(event.location_name || '')}`;

      toast.success(
        <div>
          <p className="font-semibold mb-2">Booking submitted!</p>
          <p className="text-sm mb-2">Awaiting organizer confirmation.</p>
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
      setFormData({ name: '', email: '' });
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

          {hasPaymentInfo && (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
