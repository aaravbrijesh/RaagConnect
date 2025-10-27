import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye, Calendar, Mail, User, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface BookingManagementProps {
  eventId: string;
}

export default function BookingManagement({ eventId }: BookingManagementProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBookings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookings(data || []);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success(`Booking ${status}!`);
      await fetchBookings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      confirmed: 'default',
      rejected: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (bookings.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <p>No pending bookings for this event.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Pending Bookings ({bookings.length})</h3>
      </div>

      {bookings.map((booking) => (
        <Card key={booking.id} className="bg-card/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">{booking.attendee_name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  {booking.attendee_email}
                </CardDescription>
              </div>
              {getStatusBadge(booking.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${booking.amount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{booking.payment_method}</Badge>
            </div>

            {booking.proof_of_payment_url && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setSelectedProof(booking.proof_of_payment_url)}
              >
                <Eye className="h-4 w-4" />
                View Proof of Payment
              </Button>
            )}

            {booking.status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-2 flex-1"
                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                  disabled={loading}
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-2 flex-1"
                  onClick={() => updateBookingStatus(booking.id, 'rejected')}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Proof of Payment Modal */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Proof of Payment</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="mt-4">
              {selectedProof.endsWith('.pdf') ? (
                <iframe
                  src={selectedProof}
                  className="w-full h-[600px] border rounded"
                  title="Proof of Payment"
                />
              ) : (
                <img
                  src={selectedProof}
                  alt="Proof of Payment"
                  className="w-full rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
