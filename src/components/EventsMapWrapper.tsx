import React, { Suspense, lazy, useState, useEffect } from 'react';

const EventsMap = lazy(() => import('./EventsMap'));

type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  price: number | null;
  distance?: number;
};

type EventsMapWrapperProps = {
  events: Event[];
  userLocation: { lat: number; lng: number };
  radius: number;
  onEventClick: (eventId: string) => void;
};

export default function EventsMapWrapper(props: EventsMapWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[500px] rounded-2xl bg-muted/50 flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="w-full h-[500px] rounded-2xl bg-muted/50 flex items-center justify-center">
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      }
    >
      <EventsMap {...props} />
    </Suspense>
  );
}
