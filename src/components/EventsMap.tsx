import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
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
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function EventsMap({ events, userLocation, radius, onEventClick }: EventsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Convert radius from miles to meters
  const radiusInMeters = radius * 1609.34;

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(
      [userLocation.lat, userLocation.lng],
      10
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update user location marker and circle
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing user marker and circle
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }
    if (circleRef.current) {
      circleRef.current.remove();
    }

    // Create user location marker
    const userIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(mapRef.current)
      .bindPopup('<div class="text-center font-semibold">Your Location</div>');

    // Create search radius circle
    circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
      radius: radiusInMeters,
      color: '#9333ea',
      fillColor: '#9333ea',
      fillOpacity: 0.1,
      weight: 2
    }).addTo(mapRef.current);

    // Center map on user location
    mapRef.current.setView([userLocation.lat, userLocation.lng], 10);
  }, [userLocation, radiusInMeters]);

  // Update event markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing event markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const eventIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Add event markers
    events.forEach(event => {
      if (!event.location_lat || !event.location_lng) return;

      const popupContent = `
        <div class="min-w-[200px]">
          <h3 class="font-bold text-base mb-2">${event.title}</h3>
          <p class="text-sm text-gray-600 mb-1">
            ${new Date(event.date).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
          ${event.location_name ? `<p class="text-sm text-gray-600 mb-1">${event.location_name}</p>` : ''}
          ${event.distance ? `<p class="text-sm font-semibold text-purple-600">${Math.round(event.distance)} miles away</p>` : ''}
          ${event.price ? `<p class="text-sm font-semibold text-purple-600 mt-2">$${event.price}</p>` : ''}
        </div>
      `;

      const marker = L.marker([event.location_lat, event.location_lng], { icon: eventIcon })
        .addTo(mapRef.current!)
        .bindPopup(popupContent);

      marker.on('click', () => onEventClick(event.id));
      markersRef.current.push(marker);
    });

    // Fit bounds if there are events
    if (events.length > 0) {
      const bounds = L.latLngBounds([
        [userLocation.lat, userLocation.lng],
        ...events
          .filter(e => e.location_lat && e.location_lng)
          .map(e => [e.location_lat!, e.location_lng!] as [number, number])
      ]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [events, userLocation, onEventClick]);

  return (
    <div 
      ref={mapContainerRef}
      className="w-full h-[500px] rounded-2xl overflow-hidden border border-border shadow-lg"
    />
  );
}
