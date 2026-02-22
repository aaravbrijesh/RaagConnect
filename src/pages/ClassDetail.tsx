import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Nav from '@/components/Nav';
import AddToCalendar from '@/components/AddToCalendar';
import ClassCalendarView, { TimeSlot } from '@/components/ClassCalendarView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft, GraduationCap, MapPin, DollarSign, Users, Clock,
  Globe, User as UserIcon, CalendarPlus, Check, Mail
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cls, setCls] = useState<any>(null);
  const [teacherName, setTeacherName] = useState('');
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedEvent, setBookedEvent] = useState<{ title: string; startDate: Date; endDate: Date; location?: string } | null>(null);

  useEffect(() => {
    if (id) fetchClass();
  }, [id]);

  const fetchClass = async () => {
    try {
      const [{ data: classData, error }, { data: availData }, { data: bookingsData }] = await Promise.all([
        supabase.from('classes').select('*').eq('id', id!).single(),
        supabase.from('class_availability').select('*').eq('class_id', id!).order('day_of_week'),
        supabase.from('class_bookings').select('*').eq('class_id', id!).gte('booking_date', new Date().toISOString().split('T')[0]),
      ]);
      if (error) throw error;
      setCls(classData);
      setAvailability(availData || []);
      setExistingBookings(bookingsData || []);

      // Fetch teacher name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', classData.user_id).maybeSingle();
      setTeacherName(profile?.full_name || 'Unknown Teacher');

      // Pre-fill user info
      if (user) {
        setBookingEmail(user.email || '');
        const { data: myProfile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
        if (myProfile?.full_name) setBookingName(myProfile.full_name);
      }
    } catch (err: any) {
      toast.error('Failed to load class');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // generateTimeSlots is now handled by ClassCalendarView

  const handleBook = async () => {
    if (!user) { toast.error('Please sign in to book'); return; }
    if (!selectedSlot || !bookingName.trim() || !bookingEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setBooking(true);
    try {
      const dateStr = format(selectedSlot.date, 'yyyy-MM-dd');
      const { error } = await supabase.from('class_bookings').insert({
        class_id: id!,
        availability_id: selectedSlot.availability_id,
        user_id: user.id,
        student_name: bookingName.trim(),
        student_email: bookingEmail.trim(),
        booking_date: dateStr,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: bookingNotes.trim() || null,
      });
      if (error) throw error;

      // Build calendar event
      const [sH, sM] = selectedSlot.start_time.split(':').map(Number);
      const [eH, eM] = selectedSlot.end_time.split(':').map(Number);
      const startDate = new Date(selectedSlot.date);
      startDate.setHours(sH, sM, 0);
      const endDate = new Date(selectedSlot.date);
      endDate.setHours(eH, eM, 0);

      setBookedEvent({
        title: `${cls.title} with ${teacherName}`,
        startDate,
        endDate,
        location: cls.location_name || undefined,
      });
      setBooked(true);
      toast.success('Session booked successfully!');
    } catch (err: any) {
      toast.error('Booking failed: ' + err.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Class not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/classes')}>Back to Classes</Button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === cls.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate('/classes')}>
          <ArrowLeft className="h-4 w-4" /> Back to Classes
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class Info */}
          <div className="lg:col-span-2 space-y-6">
            {cls.image_url && (
              <div className="rounded-xl overflow-hidden h-64">
                <img src={cls.image_url} alt={cls.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold mb-2">{cls.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{cls.genre}</Badge>
                <Badge variant="outline" className="capitalize">{cls.skill_level}</Badge>
                <Badge variant="outline" className="capitalize flex items-center gap-1">
                  {cls.class_type === 'online' ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                  {cls.class_type}
                </Badge>
              </div>
            </div>

            {cls.description && (
              <Card>
                <CardHeader><CardTitle className="text-base">About This Class</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{cls.description}</p></CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Teacher: <span className="font-medium">{teacherName}</span></span>
                </div>
                {cls.location_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{cls.location_name}</span>
                  </div>
                )}
                {cls.recurring_schedule && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{cls.recurring_schedule}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{cls.price != null ? `$${cls.price} per session` : 'Contact for pricing'}</span>
                </div>
                {cls.max_capacity && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Max {cls.max_capacity} students</span>
                  </div>
                )}
                {cls.contact_info && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{cls.contact_info}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Sidebar */}
          <div className="space-y-6">
            {booked && bookedEvent ? (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Session Booked!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(bookedEvent.startDate, 'EEEE, MMMM d')} at {format(bookedEvent.startDate, 'h:mm a')}
                    </p>
                  </div>
                  <AddToCalendar event={bookedEvent} variant="default" size="default" className="w-full" />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setBooked(false); setSelectedSlot(null); fetchClass(); }}>
                    Book Another Session
                  </Button>
                </CardContent>
              </Card>
            ) : availability.length > 0 && !isOwner ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <ClassCalendarView
                    classId={id!}
                    availability={availability}
                    existingBookings={existingBookings}
                    hasIcal={!!cls.ical_url}
                    onSelectSlot={setSelectedSlot}
                    selectedSlot={selectedSlot}
                  />

                  {selectedSlot && (
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-sm font-medium">
                        {format(selectedSlot.date, 'EEEE, MMMM d')} — {selectedSlot.start_time} to {selectedSlot.end_time}
                      </p>
                      <div className="space-y-2">
                        <Label className="text-xs">Your Name *</Label>
                        <Input value={bookingName} onChange={e => setBookingName(e.target.value)} placeholder="Full name" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Email *</Label>
                        <Input type="email" value={bookingEmail} onChange={e => setBookingEmail(e.target.value)} placeholder="Email" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Notes (optional)</Label>
                        <Textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Anything the teacher should know?" rows={2} className="text-sm" />
                      </div>
                      <Button className="w-full" onClick={handleBook} disabled={booking || !user}>
                        {booking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking...</> : !user ? 'Sign in to book' : 'Confirm Booking'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : !isOwner ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No scheduling available yet</p>
                  {cls.contact_info && <p className="text-xs text-primary mt-2">Contact: {cls.contact_info}</p>}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">This is your class listing</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
