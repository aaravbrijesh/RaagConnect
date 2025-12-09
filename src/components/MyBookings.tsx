import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Ticket, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import ShareEvent from './ShareEvent';

interface MyBookingsProps {
  userId: string;
}

export default function MyBookings({ userId }: MyBookingsProps) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        events(id, title, date, time, location_name, price, image_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };
    const { variant, label } = config[status] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatEventDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>My Bookings</span>
          <Badge variant="outline" className="font-normal">
            {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
          </Badge>
        </CardTitle>
        <CardDescription>Your event tickets and booking history</CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">You haven't booked any events yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
              Discover Events
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                {/* Event Image */}
                {booking.events?.image_url && (
                  <div className="w-full sm:w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={booking.events.image_url}
                      alt={booking.events.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold truncate">{booking.events?.title || 'Event'}</h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {booking.events?.date ? formatEventDate(booking.events.date) : 'TBA'}
                        </span>
                        {booking.events?.location_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {booking.events.location_name}
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm text-muted-foreground">
                      Booked {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-2">
                      {booking.events && (
                        <ShareEvent
                          title={booking.events.title}
                          url={`${window.location.origin}/events/${booking.events.id}`}
                          date={booking.events.date ? formatEventDate(booking.events.date) : undefined}
                          variant="ghost"
                          size="sm"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => navigate(`/events/${booking.events?.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Event
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
