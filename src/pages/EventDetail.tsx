import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Ticket, Edit, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import Nav from '@/components/Nav';
import EventDiscussion from '@/components/EventDiscussion';
import BookingModal from '@/components/BookingModal';
import BookingManagement from '@/components/BookingManagement';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { isAdmin } = useUserRoles(user?.id);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, artists(*), event_artists(artist_id, artists(*))')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Failed to load event');
      console.error(error);
      navigate('/');
    } else {
      setEvent(data);
    }
    setLoading(false);
  };

  const getArtistNames = () => {
    if (!event) return 'TBA';
    if (event.event_artists && event.event_artists.length > 0) {
      return event.event_artists.map((ea: any) => ea.artists?.name).filter(Boolean).join(', ') || 'TBA';
    }
    return event.artists?.name || 'TBA';
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Event not found</p>
        </div>
      </>
    );
  }

  const isOwnerOrAdmin = user && (event.user_id === user.id || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-6 gap-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Event Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.title}</h1>
              <p className="text-lg text-muted-foreground">{getArtistNames()}</p>
            </div>
            {isOwnerOrAdmin && (
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => navigate(`/events/create?edit=${event.id}`)}
                >
                  <Edit className="h-4 w-4" />
                  Edit Event
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Event</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{event.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          const { error } = await supabase
                            .from('events')
                            .delete()
                            .eq('id', event.id);
                          
                          if (error) {
                            toast.error('Failed to delete event');
                          } else {
                            toast.success('Event deleted successfully');
                            navigate('/');
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Event Image */}
          {event.image_url && (
            <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Event Details */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">{event.time}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium">{event.location_name || 'Location TBA'}</span>
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {event.price ? `$${event.price}` : 'Free Entry'}
                </span>
              </div>
              
              <Button
                className="w-full" 
                size="lg"
                onClick={() => {
                  if (!user || !session) {
                    toast.error('Please sign in to book this event', {
                      action: {
                        label: 'Sign In',
                        onClick: () => navigate('/login')
                      }
                    });
                    return;
                  }
                  setBookingModalOpen(true);
                }}
              >
                Book Tickets
              </Button>
            </div>
          </div>

          {/* Tabs for Announcements and Bookings */}
          <div className="border-t pt-8">
            {isOwnerOrAdmin ? (
              <Tabs defaultValue="announcements">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="announcements">Announcements</TabsTrigger>
                  <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="announcements" className="mt-6">
                  <EventDiscussion eventId={event.id} organizerId={event.user_id} />
                </TabsContent>
                
                <TabsContent value="bookings" className="mt-6">
                  <BookingManagement eventId={event.id} />
                </TabsContent>
              </Tabs>
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-4">Announcements</h2>
                <EventDiscussion eventId={event.id} organizerId={event.user_id} />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        event={event}
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
      />
    </div>
  );
}
