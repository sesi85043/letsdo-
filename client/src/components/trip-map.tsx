import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TripWithRelations, GpsRoutePoint } from '@shared/schema';

interface TripMapProps {
  trip: TripWithRelations;
  gpsPoints: GpsRoutePoint[];
  currentPosition?: { lat: number; lng: number } | null;
}

export function TripMap({ trip, gpsPoints, currentPosition }: TripMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const defaultCenter: [number, number] = [40.7128, -74.006];
    let center = defaultCenter;
    let zoom = 12;

    if (gpsPoints.length > 0) {
      center = [gpsPoints[0].latitude, gpsPoints[0].longitude];
    } else if (trip.job?.pickupLat && trip.job?.pickupLng) {
      center = [trip.job.pickupLat, trip.job.pickupLng];
    } else if (currentPosition) {
      center = [currentPosition.lat, currentPosition.lng];
    }

    const map = L.map(containerRef.current).setView(center, zoom);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(217, 91%, 60%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const endIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(173, 80%, 40%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const currentIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(27, 87%, 55%);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
          100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }
      </style>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const bounds: [number, number][] = [];

    if (trip.job?.pickupLat && trip.job?.pickupLng) {
      L.marker([trip.job.pickupLat, trip.job.pickupLng], { icon: startIcon })
        .bindPopup(`<b>Pickup</b><br/>${trip.job.pickupAddress}`)
        .addTo(map);
      bounds.push([trip.job.pickupLat, trip.job.pickupLng]);
    }

    if (trip.job?.deliveryLat && trip.job?.deliveryLng) {
      L.marker([trip.job.deliveryLat, trip.job.deliveryLng], { icon: endIcon })
        .bindPopup(`<b>Delivery</b><br/>${trip.job.deliveryAddress}`)
        .addTo(map);
      bounds.push([trip.job.deliveryLat, trip.job.deliveryLng]);
    }

    if (gpsPoints.length > 0) {
      const routeCoords: [number, number][] = gpsPoints.map((p) => [p.latitude, p.longitude]);
      bounds.push(...routeCoords);

      L.polyline(routeCoords, {
        color: 'hsl(217, 91%, 60%)',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      const lastPoint = gpsPoints[gpsPoints.length - 1];
      if (trip.status === 'in_progress') {
        L.marker([lastPoint.latitude, lastPoint.longitude], { icon: currentIcon })
          .bindPopup('Current Position')
          .addTo(map);
      }
    }

    if (currentPosition && trip.status === 'in_progress') {
      L.marker([currentPosition.lat, currentPosition.lng], { icon: currentIcon })
        .bindPopup('Your Current Position')
        .addTo(map);
      bounds.push([currentPosition.lat, currentPosition.lng]);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [trip, gpsPoints, currentPosition]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      data-testid="trip-map"
    />
  );
}
