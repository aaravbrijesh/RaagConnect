import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, addDays, isSameDay } from 'date-fns';
import { CalendarPlus, Loader2 } from 'lucide-react';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

interface BusyTime {
  start: string;
  end: string;
}

export interface TimeSlot {
  availability_id: string;
  date: Date;
  start_time: string;
  end_time: string;
  booked: boolean;
  busy: boolean; // from Google Calendar
}

interface ClassCalendarViewProps {
  classId: string;
  availability: AvailabilitySlot[];
  existingBookings: any[];
  hasIcal: boolean;
  onSelectSlot: (slot: TimeSlot) => void;
  selectedSlot: TimeSlot | null;
}

export default function ClassCalendarView({
  classId,
  availability,
  existingBookings,
  hasIcal,
  onSelectSlot,
  selectedSlot,
}: ClassCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [busyTimes, setBusyTimes] = useState<BusyTime[]>([]);
  const [loadingBusy, setLoadingBusy] = useState(false);

  // Fetch busy times from Google Calendar if teacher has linked one
  useEffect(() => {
    if (!hasIcal) return;
    const fetchBusy = async () => {
      setLoadingBusy(true);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-busy-times', {
          body: { class_id: classId },
        });
        if (!error && data?.busy_times) {
          setBusyTimes(data.busy_times);
        }
      } catch (err) {
        console.error('Failed to fetch busy times:', err);
      } finally {
        setLoadingBusy(false);
      }
    };
    fetchBusy();
  }, [classId, hasIcal]);

  // Generate all time slots for next 14 days
  const allSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = addDays(today, dayOffset);
      const dayOfWeek = date.getDay();

      const daySlots = availability.filter(a => a.day_of_week === dayOfWeek);
      for (const avail of daySlots) {
        const [startH, startM] = avail.start_time.split(':').map(Number);
        const [endH, endM] = avail.end_time.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        for (let m = startMinutes; m + avail.slot_duration_minutes <= endMinutes; m += avail.slot_duration_minutes) {
          const slotStartH = Math.floor(m / 60);
          const slotStartM = m % 60;
          const slotEndTotal = m + avail.slot_duration_minutes;
          const slotEndH = Math.floor(slotEndTotal / 60);
          const slotEndMin = slotEndTotal % 60;

          const startStr = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;
          const endStr = `${String(slotEndH).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;

          const dateStr = format(date, 'yyyy-MM-dd');
          const isBooked = existingBookings.some(
            b => b.booking_date === dateStr && b.start_time === startStr + ':00' && b.status !== 'cancelled'
          );

          // Check if slot overlaps with any Google Calendar busy time
          const slotStart = new Date(date);
          slotStart.setHours(slotStartH, slotStartM, 0);
          const slotEnd = new Date(date);
          slotEnd.setHours(slotEndH, slotEndMin, 0);

          // Skip past slots
          if (slotStart <= new Date()) continue;

          const isBusy = busyTimes.some(bt => {
            const busyStart = new Date(bt.start);
            const busyEnd = new Date(bt.end);
            return slotStart < busyEnd && slotEnd > busyStart;
          });

          slots.push({
            availability_id: avail.id,
            date,
            start_time: startStr,
            end_time: endStr,
            booked: isBooked,
            busy: isBusy,
          });
        }
      }
    }
    return slots;
  }, [availability, existingBookings, busyTimes]);

  // Which dates have available slots
  const datesWithSlots = useMemo(() => {
    const dateMap = new Map<string, { total: number; available: number }>();
    for (const slot of allSlots) {
      const key = format(slot.date, 'yyyy-MM-dd');
      const existing = dateMap.get(key) || { total: 0, available: 0 };
      existing.total++;
      if (!slot.booked && !slot.busy) existing.available++;
      dateMap.set(key, existing);
    }
    return dateMap;
  }, [allSlots]);

  // Slots for the selected date
  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return allSlots.filter(s => isSameDay(s.date, selectedDate));
  }, [allSlots, selectedDate]);

  const today = new Date();
  const maxDate = addDays(today, 13);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <CalendarPlus className="h-4 w-4" />
        <h3 className="text-base font-semibold">Book a Session</h3>
        {loadingBusy && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {/* Calendar */}
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        disabled={(date) => {
          const key = format(date, 'yyyy-MM-dd');
          const info = datesWithSlots.get(key);
          return !info || info.available === 0;
        }}
        modifiers={{
          hasSlots: (date) => {
            const key = format(date, 'yyyy-MM-dd');
            const info = datesWithSlots.get(key);
            return !!info && info.available > 0;
          },
        }}
        modifiersClassNames={{
          hasSlots: 'bg-primary/10 font-semibold text-primary',
        }}
        fromDate={today}
        toDate={maxDate}
        className="rounded-md border w-full"
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-primary/10 border border-primary/30" /> Available
        </span>
        {hasIcal && (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-destructive/20 border border-destructive/30" /> Teacher Busy
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-muted border" /> Booked
        </span>
      </div>

      {/* Time slots for selected date */}
      {selectedDate && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {format(selectedDate, 'EEEE, MMMM d')}
          </p>
          {slotsForDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots available</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {slotsForDate.map((slot, i) => {
                const isUnavailable = slot.booked || slot.busy;
                const isSelected = selectedSlot?.date === slot.date &&
                  selectedSlot?.start_time === slot.start_time;

                return (
                  <Button
                    key={i}
                    size="sm"
                    variant={isSelected ? 'default' : isUnavailable ? 'ghost' : 'outline'}
                    disabled={isUnavailable}
                    className={`text-xs h-7 px-2 ${
                      slot.busy ? 'line-through text-destructive/50' : ''
                    } ${slot.booked ? 'text-muted-foreground' : ''}`}
                    onClick={() => onSelectSlot(slot)}
                    title={slot.busy ? 'Teacher is busy' : slot.booked ? 'Already booked' : `${slot.start_time} - ${slot.end_time}`}
                  >
                    {slot.start_time}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
