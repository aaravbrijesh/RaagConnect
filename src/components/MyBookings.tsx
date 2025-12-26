import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, MapPin, Ticket, Loader2, ExternalLink, Info, Clock } from 'lucide-react';
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
        events(id, title, date, time, location_name, price, image_url, confirmation_type)
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

  const isUpcoming = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  };

  const getStatusBadge = (status: string, confirmationType?: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };
    const { variant, label } = config[status] || config.pending;
    
    if (status === 'pending' && confirmationType === 'online') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Badge variant={variant}>{label}</Badge>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-[200px]">
              <p className="text-xs">The organizer reviews and approves each booking individually.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatEventDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Separate bookings into upcoming and past
  const upcomingBookings = bookings.filter(b => b.events?.date && isUpcoming(b.events.date));
  const pastBookings = bookings.filter(b => b.events?.date && !isUpcoming(b.events.date));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderBookingCard = (booking: any, isPast: boolean) => (
    <div
      key={booking.id}
      className={`flex flex-col sm:flex-row gap-4 p-4 border rounded-lg transition-colors ${isPast ? 'opacity-70 bg-muted/30' : 'hover:bg-muted/30'}`}
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
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate">{booking.events?.title || 'Event'}</h4>
              {isPast && (
                <Badge variant="outline" className="text-xs shrink-0">Past</Badge>
              )}
            </div>
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
          {getStatusBadge(booking.status, booking.events?.confirmation_type)}
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
  );

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
          <div className="space-y-6">
            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Clock className="h-4 w-4" />
                  Upcoming Events ({upcomingBookings.length})
                </div>
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => renderBookingCard(booking, false))}
                </div>
              </div>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Past Events ({pastBookings.length})
                </div>
                <div className="space-y-3">
                  {pastBookings.map((booking) => renderBookingCard(booking, true))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
