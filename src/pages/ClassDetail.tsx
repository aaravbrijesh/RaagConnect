import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Nav from '@/components/Nav';
import AddToCalendar from '@/components/AddToCalendar';
import ClassCalendarView, { TimeSlot } from '@/components/ClassCalendarView';
import ClassAnnouncements from '@/components/ClassAnnouncements';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import {
  ArrowLeft, MapPin, DollarSign, Users, Clock,
  Globe, User as UserIcon, Check, Mail, Pencil
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime12h(time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
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
  const [isRecurring, setIsRecurring] = useState(false);
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

      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', classData.user_id).maybeSingle();
      setTeacherName(profile?.full_name || 'Unknown Teacher');

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

  const handleBook = async () => {
    if (!user) { toast.error('Please sign in to book'); return; }
    if (!selectedSlot || !bookingName.trim() || !bookingEmail.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setBooking(true);
    try {
      const bookings: any[] = [];
      const dateStr = format(selectedSlot.date, 'yyyy-MM-dd');

      // Create the primary booking
      bookings.push({
        class_id: id!,
        availability_id: selectedSlot.availability_id === 'ical' ? null : selectedSlot.availability_id,
        user_id: user.id,
        student_name: bookingName.trim(),
        student_email: bookingEmail.trim(),
        booking_date: dateStr,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        notes: bookingNotes.trim() || null,
        is_recurring: isRecurring,
      });

      // If recurring, book the same slot for the next 3 weeks (4 weeks total)
      if (isRecurring) {
        for (let w = 1; w <= 3; w++) {
          const recurDate = addDays(selectedSlot.date, w * 7);
          bookings.push({
            class_id: id!,
            availability_id: selectedSlot.availability_id === 'ical' ? null : selectedSlot.availability_id,
            user_id: user.id,
            student_name: bookingName.trim(),
            student_email: bookingEmail.trim(),
            booking_date: format(recurDate, 'yyyy-MM-dd'),
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            notes: bookingNotes.trim() || null,
            is_recurring: true,
          });
        }
      }

      const { error } = await supabase.from('class_bookings').insert(bookings);
      if (error) throw error;

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
      toast.success(isRecurring ? 'Booked for 4 weeks!' : 'Session booked successfully!');
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
  const classMode = (cls as any).class_mode || '1-on-1';
  const isGroupClass = classMode === 'group';

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/classes')}>
            <ArrowLeft className="h-4 w-4" /> Back to Classes
          </Button>
          {isOwner && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/classes/create?edit=${id}`)}>
              <Pencil className="h-3.5 w-3.5" /> Edit Class
            </Button>
          )}
        </div>

        {/* Teacher Header */}
        <div className="border-b border-border pb-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{teacherName}</p>
              <h1 className="text-2xl font-bold text-foreground leading-tight">{cls.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {cls.price != null && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    ${cls.price}/session
                  </span>
                )}
                <Badge variant="secondary" className="text-xs font-normal">{cls.genre}</Badge>
                <Badge variant="outline" className="text-xs font-normal capitalize">{cls.skill_level}</Badge>
                <Badge variant={isGroupClass ? 'default' : 'outline'} className="text-xs font-normal">
                  {isGroupClass ? 'Group' : '1-on-1'}
                </Badge>
                <span className="flex items-center gap-1 capitalize">
                  {cls.class_type === 'online' ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {cls.class_type}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {booked && bookedEvent ? (
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-8 pb-8 text-center space-y-5">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground">You're booked!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {format(bookedEvent.startDate, 'EEEE, MMMM d')} at {format(bookedEvent.startDate, 'h:mm a')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {cls.title} with {teacherName}
                </p>
                {isRecurring && (
                  <p className="text-xs text-primary mt-1">Recurring weekly for 4 weeks</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <AddToCalendar event={bookedEvent} variant="default" size="default" className="w-full" />
                <Button variant="ghost" size="sm" onClick={() => { setBooked(false); setSelectedSlot(null); setIsRecurring(false); fetchClass(); }}>
                  Book another session
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isGroupClass ? (
          /* Group Class View */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Class Schedule</h3>
                  {(cls as any).group_schedule_day != null && (cls as any).group_schedule_time ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">
                            Every {DAYS[(cls as any).group_schedule_day]}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime12h((cls as any).group_schedule_time.slice(0, 5))}
                            {(cls as any).group_schedule_end_time && ` – ${formatTime12h((cls as any).group_schedule_end_time.slice(0, 5))}`}
                          </p>
                        </div>
                      </div>
                      {cls.recurring_schedule && (
                        <p className="text-sm text-muted-foreground">{cls.recurring_schedule}</p>
                      )}
                      {!isOwner && cls.contact_info && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                          <p className="text-sm text-foreground font-medium mb-1">Interested in joining?</p>
                          <p className="text-sm text-muted-foreground">Contact: {cls.contact_info}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {isOwner ? 'Set a schedule by editing this class' : 'Schedule not set yet'}
                      </p>
                      {cls.recurring_schedule && (
                        <p className="text-sm text-muted-foreground mt-2">{cls.recurring_schedule}</p>
                      )}
                    </div>
                  )}
                  {isOwner && (
                    <p className="text-xs text-muted-foreground text-center mt-4 pt-3 border-t border-border">
                      This is your group class — students see the schedule and contact you to join.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-2 space-y-5">
              {/* Details */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Details</h3>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    {cls.description && <p className="whitespace-pre-wrap">{cls.description}</p>}
                    {cls.location_name && (
                      <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 flex-shrink-0" /><span>{cls.location_name}</span></div>
                    )}
                    {cls.max_capacity && (
                      <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 flex-shrink-0" /><span>Max {cls.max_capacity} students</span></div>
                    )}
                    {cls.contact_info && (
                      <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span>{cls.contact_info}</span></div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <ClassAnnouncements classId={id!} isOwner={isOwner} />
            </div>
          </div>
        ) : (
          /* 1-on-1 Class View */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-6">
                  {availability.length > 0 || cls.ical_url ? (
                    <>
                      <ClassCalendarView
                        classId={id!}
                        availability={availability}
                        existingBookings={existingBookings}
                        hasIcal={!!cls.ical_url}
                        onSelectSlot={isOwner ? () => {} : setSelectedSlot}
                        selectedSlot={isOwner ? null : selectedSlot}
                        readOnly={isOwner}
                      />
                      {isOwner && (
                        <p className="text-xs text-muted-foreground text-center mt-4 pt-3 border-t border-border">
                          This is your class — this is what students see.
                          {availability.length === 0 && !cls.ical_url && ' Add availability slots or link your calendar to enable booking.'}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="py-12 text-center">
                      <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {isOwner ? 'Link your Google Calendar or add availability to enable booking' : 'No scheduling available yet'}
                      </p>
                      {!isOwner && cls.contact_info && (
                        <p className="text-xs text-primary mt-2">Contact: {cls.contact_info}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-5">
              {/* Booking Form */}
              {!isOwner && selectedSlot && (
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {format(selectedSlot.date, 'EEEE, MMMM d')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedSlot.start_time} – {selectedSlot.end_time}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Name *</Label>
                        <Input value={bookingName} onChange={e => setBookingName(e.target.value)} placeholder="Your name" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Email *</Label>
                        <Input type="email" value={bookingEmail} onChange={e => setBookingEmail(e.target.value)} placeholder="you@email.com" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Anything the teacher should know?" rows={2} className="text-sm resize-none" />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Checkbox
                          id="recurring"
                          checked={isRecurring}
                          onCheckedChange={(checked) => setIsRecurring(checked === true)}
                        />
                        <label htmlFor="recurring" className="text-sm text-foreground cursor-pointer">
                          Book weekly (same time, 4 weeks)
                        </label>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleBook} disabled={booking || !user}>
                      {booking ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Booking…</>
                      ) : !user ? (
                        'Sign in to book'
                      ) : isRecurring ? (
                        'Book 4 Sessions'
                      ) : (
                        'Confirm Booking'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Details */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Details</h3>
                  <div className="space-y-2.5 text-sm text-muted-foreground">
                    {cls.description && <p className="whitespace-pre-wrap">{cls.description}</p>}
                    {cls.location_name && (
                      <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 flex-shrink-0" /><span>{cls.location_name}</span></div>
                    )}
                    {cls.recurring_schedule && (
                      <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 flex-shrink-0" /><span>{cls.recurring_schedule}</span></div>
                    )}
                    {cls.max_capacity && (
                      <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 flex-shrink-0" /><span>Max {cls.max_capacity} students</span></div>
                    )}
                    {cls.contact_info && (
                      <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span>{cls.contact_info}</span></div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <ClassAnnouncements classId={id!} isOwner={isOwner} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
