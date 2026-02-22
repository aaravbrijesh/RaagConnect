import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { format, addDays, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isBefore } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Clock } from 'lucide-react';

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

interface ICalSlot {
  start: string;
  end: string;
}

export interface TimeSlot {
  availability_id: string;
  date: Date;
  start_time: string;
  end_time: string;
  booked: boolean;
  busy: boolean;
}

interface ClassCalendarViewProps {
  classId: string;
  availability: AvailabilitySlot[];
  existingBookings: any[];
  hasIcal: boolean;
  onSelectSlot: (slot: TimeSlot) => void;
  selectedSlot: TimeSlot | null;
  readOnly?: boolean;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function ClassCalendarView({
  classId,
  availability,
  existingBookings,
  hasIcal,
  onSelectSlot,
  selectedSlot,
  readOnly = false,
}: ClassCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [icalSlots, setIcalSlots] = useState<ICalSlot[]>([]);
  const [loadingIcal, setLoadingIcal] = useState(false);
  const [icalError, setIcalError] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, 29); // 30 days window

  useEffect(() => {
    if (!hasIcal) return;
    const fetchSlots = async () => {
      setLoadingIcal(true);
      setIcalError(null);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-busy-times', {
          body: { class_id: classId },
        });
        if (!error && data?.slots) {
          setIcalSlots(data.slots);
        }
        if (data?.error) {
          setIcalError(data.error);
        }
      } catch (err) {
        console.error('Failed to fetch calendar slots:', err);
      } finally {
        setLoadingIcal(false);
      }
    };
    fetchSlots();
  }, [classId, hasIcal]);

  // Generate time slots from EITHER class_availability records OR iCal events
  const allSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const now = new Date();

    // If we have class_availability records, use those (original behavior)
    if (availability.length > 0) {
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
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

            const slotStart = new Date(date);
            slotStart.setHours(slotStartH, slotStartM, 0);
            if (slotStart <= now) continue;

            slots.push({
              availability_id: avail.id,
              date,
              start_time: startStr,
              end_time: endStr,
              booked: isBooked,
              busy: false,
            });
          }
        }
      }
    }
    // If no class_availability but we have iCal slots, use those as available times
    else if (icalSlots.length > 0) {
      for (const ical of icalSlots) {
        const slotStart = new Date(ical.start);
        const slotEnd = new Date(ical.end);

        if (slotStart <= now) continue;
        if (slotStart > maxDate) continue;

        const startStr = `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`;
        const endStr = `${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`;

        const dateStr = format(slotStart, 'yyyy-MM-dd');
        const isBooked = existingBookings.some(
          b => b.booking_date === dateStr && b.start_time === startStr + ':00' && b.status !== 'cancelled'
        );

        slots.push({
          availability_id: 'ical', // placeholder for iCal-sourced slots
          date: new Date(slotStart.getFullYear(), slotStart.getMonth(), slotStart.getDate()),
          start_time: startStr,
          end_time: endStr,
          booked: isBooked,
          busy: false,
        });
      }
    }

    return slots;
  }, [availability, existingBookings, icalSlots]);

  // Dates that have available slots
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    for (const slot of allSlots) {
      if (!slot.booked && !slot.busy) {
        set.add(format(slot.date, 'yyyy-MM-dd'));
      }
    }
    return set;
  }, [allSlots]);

  // Slots for selected date
  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return allSlots.filter(s => isSameDay(s.date, selectedDate));
  }, [allSlots, selectedDate]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const isDateAvailable = (date: Date) => {
    return availableDates.has(format(date, 'yyyy-MM-dd'));
  };

  const isInRange = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d >= today && d <= maxDate;
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const canGoPrev = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    return endOfMonth(prevMonth) >= today;
  };

  const canGoNext = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    return startOfMonth(nextMonth) <= maxDate;
  };

  const handleDateClick = (date: Date) => {
    if (!isInRange(date) || !isDateAvailable(date)) return;
    setSelectedDate(date);
  };

  const formatTime12h = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <h3 className="text-lg font-semibold text-foreground mb-1">Select a Date & Time</h3>
      {loadingIcal && (
        <div className="flex items-center gap-1.5 mb-3">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading calendar…</span>
        </div>
      )}
      {icalError && (
        <p className="text-xs text-destructive mb-3">{icalError}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Calendar Panel */}
        <div className="flex-1 min-w-0">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                disabled={!canGoPrev()}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                disabled={!canGoNext()}
                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Date Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const inRange = isInRange(day);
              const available = isDateAvailable(day);
              const inMonth = isCurrentMonth(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const todayDate = isToday(day);

              return (
                <button
                  key={i}
                  onClick={() => handleDateClick(day)}
                  disabled={!inRange || !available || readOnly}
                  className={`
                    relative aspect-square flex items-center justify-center text-sm transition-all
                    ${!inMonth ? 'text-muted-foreground/30' : ''}
                    ${inMonth && !inRange ? 'text-muted-foreground/40 cursor-not-allowed' : ''}
                    ${inMonth && inRange && !available ? 'text-muted-foreground/50 cursor-not-allowed' : ''}
                    ${inMonth && inRange && available && !selected ? 'text-foreground font-medium hover:bg-primary/10 cursor-pointer rounded-full' : ''}
                    ${selected ? 'bg-primary text-primary-foreground font-semibold rounded-full' : ''}
                    ${todayDate && !selected ? 'font-bold' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {todayDate && !selected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                  {available && !selected && inMonth && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots Panel */}
        <div className="sm:w-44 sm:border-l sm:pl-6 border-border">
          {selectedDate ? (
            <div>
              <p className="text-sm font-medium text-foreground mb-3">
                {format(selectedDate, 'EEE, MMM d')}
              </p>
              {slotsForDate.length === 0 ? (
                <p className="text-sm text-muted-foreground">No slots</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {slotsForDate.map((slot, i) => {
                    const isUnavailable = slot.booked || slot.busy;
                    const isSelected = selectedSlot &&
                      isSameDay(selectedSlot.date, slot.date) &&
                      selectedSlot.start_time === slot.start_time;

                    if (isUnavailable) return null;

                    return (
                      <button
                        key={i}
                        onClick={() => !readOnly && onSelectSlot(slot)}
                        disabled={readOnly}
                        className={`
                          w-full py-2.5 px-3 rounded-lg text-sm font-medium transition-all border
                          ${isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-primary border-primary/30 hover:bg-primary/5 hover:border-primary/60'
                          }
                          ${readOnly ? 'cursor-default opacity-70' : 'cursor-pointer'}
                        `}
                      >
                        {formatTime12h(slot.start_time)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 sm:py-0">
              <Clock className="h-5 w-5 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground text-center">
                Select a date to view available times
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Timezone hint */}
      <p className="text-[11px] text-muted-foreground mt-4">
        {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
    </div>
  );
}
