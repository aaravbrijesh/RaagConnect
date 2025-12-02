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

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([userLocation.lat, userLocation.lng], 10);

    // Use CartoDB Voyager tiles for a cleaner, more modern look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(mapRef.current);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(mapRef.current);

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

    // Create custom user location marker with pulse animation
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; inset: 0; background: hsl(262, 83%, 58%); border-radius: 50%; animation: pulse 2s ease-in-out infinite;"></div>
          <div style="position: absolute; inset: 4px; background: hsl(262, 83%, 58%); border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.5); opacity: 0; }
          }
        </style>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(mapRef.current)
      .bindPopup(`
        <div style="text-align: center; padding: 4px;">
          <strong style="font-size: 14px;">📍 Your Location</strong>
        </div>
      `);

    // Create search radius circle with gradient-like effect
    circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
      radius: radiusInMeters,
      color: 'hsl(262, 83%, 58%)',
      fillColor: 'hsl(262, 83%, 58%)',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '8, 8'
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

    // Add event markers with custom icons
    events.forEach(event => {
      if (!event.location_lat || !event.location_lng) return;

      const eventIcon = L.divIcon({
        className: 'custom-event-marker',
        html: `
          <div style="
            width: 36px; 
            height: 36px; 
            background: linear-gradient(135deg, hsl(350, 89%, 60%), hsl(350, 89%, 50%));
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 3px 12px rgba(0,0,0,0.25);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="transform: rotate(45deg); font-size: 14px;">🎵</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      const popupContent = `
        <div style="min-width: 220px; padding: 8px;">
          <h3 style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: #1a1a1a;">${event.title}</h3>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <p style="font-size: 13px; color: #666; margin: 0; display: flex; align-items: center; gap: 6px;">
              <span>📅</span>
              ${new Date(event.date).toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
            ${event.location_name ? `
              <p style="font-size: 13px; color: #666; margin: 0; display: flex; align-items: center; gap: 6px;">
                <span>📍</span>
                ${event.location_name.split(',').slice(0, 2).join(', ')}
              </p>
            ` : ''}
            ${event.distance ? `
              <p style="font-size: 13px; font-weight: 600; color: hsl(262, 83%, 58%); margin: 0;">
                ${Math.round(event.distance)} miles away
              </p>
            ` : ''}
          </div>
          <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 18px; font-weight: 700; color: hsl(262, 83%, 58%);">
              ${event.price ? `$${event.price}` : 'Free'}
            </span>
            <button onclick="window.dispatchEvent(new CustomEvent('event-click', {detail: '${event.id}'}))" style="
              background: linear-gradient(135deg, hsl(262, 83%, 58%), hsl(262, 83%, 48%));
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s;
            ">View Details</button>
          </div>
        </div>
      `;

      const marker = L.marker([event.location_lat, event.location_lng], { icon: eventIcon })
        .addTo(mapRef.current!)
        .bindPopup(popupContent, { maxWidth: 280 });

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
  }, [events, userLocation]);

  // Listen for custom event click
  useEffect(() => {
    const handleEventClick = (e: CustomEvent) => {
      onEventClick(e.detail);
    };
    window.addEventListener('event-click', handleEventClick as EventListener);
    return () => window.removeEventListener('event-click', handleEventClick as EventListener);
  }, [onEventClick]);

  return (
    <div className="relative">
      <div 
        ref={mapContainerRef}
        className="w-full h-[500px] rounded-2xl overflow-hidden shadow-xl"
        style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)' }}
      />
      {/* Decorative overlay gradient */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none bg-gradient-to-t from-background/20 via-transparent to-transparent" />
      
      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-border">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">You</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Events</span>
          </div>
        </div>
      </div>

      {/* Events count badge */}
      {events.length > 0 && (
        <div className="absolute top-4 left-4 bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg font-semibold text-sm">
          {events.length} event{events.length !== 1 ? 's' : ''} nearby
        </div>
      )}
    </div>
  );
}
