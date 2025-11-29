import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

type EventsMapProps = {
  events: Event[];
  userLocation: { lat: number; lng: number };
  radius: number;
  onEventClick: (eventId: string) => void;
};

// Fix Leaflet default marker icon issue
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for user location
const userIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for events
const eventIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to update map bounds
function MapUpdater({ events, userLocation }: { events: Event[], userLocation: { lat: number; lng: number } }) {
  const map = useMap();
  
  useEffect(() => {
    if (events.length > 0) {
      const bounds: [number, number][] = [
        [userLocation.lat, userLocation.lng],
        ...events
          .filter(e => e.location_lat && e.location_lng)
          .map(e => [e.location_lat!, e.location_lng!] as [number, number])
      ];
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([userLocation.lat, userLocation.lng], 10);
    }
  }, [events, userLocation, map]);
  
  return null;
}

export default function EventsMap({ events, userLocation, radius, onEventClick }: EventsMapProps) {
  // Convert radius from miles to meters for circle
  const radiusInMeters = radius * 1609.34;

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden border border-border shadow-lg">
      <MapContainer
        center={[userLocation.lat, userLocation.lng]}
        zoom={10}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-center font-semibold">Your Location</div>
          </Popup>
        </Marker>
        
        {/* Search radius circle */}
        <Circle
          center={[userLocation.lat, userLocation.lng]}
          radius={radiusInMeters}
          pathOptions={{
            color: 'hsl(var(--primary))',
            fillColor: 'hsl(var(--primary))',
            fillOpacity: 0.1,
            weight: 2
          }}
        />
        
        {/* Event markers */}
        {events.map(event => {
          if (!event.location_lat || !event.location_lng) return null;
          
          return (
            <Marker
              key={event.id}
              position={[event.location_lat, event.location_lng]}
              icon={eventIcon}
              eventHandlers={{
                click: () => onEventClick(event.id)
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-base mb-2">{event.title}</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  {event.location_name && (
                    <p className="text-sm text-muted-foreground mb-1">{event.location_name}</p>
                  )}
                  {event.distance && (
                    <p className="text-sm font-semibold text-primary">{Math.round(event.distance)} miles away</p>
                  )}
                  {event.price && (
                    <p className="text-sm font-semibold text-primary mt-2">${event.price}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        <MapUpdater events={events} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
}
