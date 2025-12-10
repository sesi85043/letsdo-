import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TripWithRelations, GpsRoutePoint, TripEvent } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, MapPin, Clock, Route, Camera } from 'lucide-react';
import { format } from 'date-fns';

interface RouteConfrontationMapProps {
  trip: TripWithRelations;
  gpsPoints: GpsRoutePoint[];
  events?: TripEvent[];
}

interface UnscheduledStop {
  latitude: number;
  longitude: number;
  startTime: Date;
  duration: number;
  address?: string;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectUnscheduledStops(
  gpsPoints: GpsRoutePoint[],
  destinationLat?: number | null,
  destinationLng?: number | null,
  stopThresholdMinutes: number = 10,
  distanceThresholdMeters: number = 100
): UnscheduledStop[] {
  if (gpsPoints.length < 2) return [];

  const stops: UnscheduledStop[] = [];
  let stopStart: GpsRoutePoint | null = null;
  let stopPoints: GpsRoutePoint[] = [];

  for (let i = 1; i < gpsPoints.length; i++) {
    const prev = gpsPoints[i - 1];
    const curr = gpsPoints[i];
    const distance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    
    if (distance < distanceThresholdMeters) {
      if (!stopStart) {
        stopStart = prev;
        stopPoints = [prev];
      }
      stopPoints.push(curr);
    } else {
      if (stopStart && stopPoints.length > 1) {
        const lastPoint = stopPoints[stopPoints.length - 1];
        const duration = (new Date(lastPoint.timestamp).getTime() - new Date(stopStart.timestamp).getTime()) / 60000;
        
        if (duration >= stopThresholdMinutes) {
          const isAtDestination = destinationLat && destinationLng &&
            calculateDistance(stopStart.latitude, stopStart.longitude, destinationLat, destinationLng) < 200;
          
          if (!isAtDestination) {
            stops.push({
              latitude: stopStart.latitude,
              longitude: stopStart.longitude,
              startTime: new Date(stopStart.timestamp),
              duration: Math.round(duration),
            });
          }
        }
      }
      stopStart = null;
      stopPoints = [];
    }
  }

  if (stopStart && stopPoints.length > 1) {
    const lastPoint = stopPoints[stopPoints.length - 1];
    const duration = (new Date(lastPoint.timestamp).getTime() - new Date(stopStart.timestamp).getTime()) / 60000;
    
    if (duration >= stopThresholdMinutes) {
      const isAtDestination = destinationLat && destinationLng &&
        calculateDistance(stopStart.latitude, stopStart.longitude, destinationLat, destinationLng) < 200;
      
      if (!isAtDestination) {
        stops.push({
          latitude: stopStart.latitude,
          longitude: stopStart.longitude,
          startTime: new Date(stopStart.timestamp),
          duration: Math.round(duration),
        });
      }
    }
  }

  return stops;
}

function interpolatePlannedRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  numPoints: number = 20
): [number, number][] {
  const route: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    route.push([
      startLat + t * (endLat - startLat),
      startLng + t * (endLng - startLng),
    ]);
  }
  return route;
}

export function RouteConfrontationMap({ trip, gpsPoints, events = [] }: RouteConfrontationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'overlay' | 'split'>('overlay');
  const [showPlanned, setShowPlanned] = useState(true);
  const [showActual, setShowActual] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showStops, setShowStops] = useState(true);

  const hasPlannedRoute = trip.job?.pickupLat && trip.job?.pickupLng && trip.job?.deliveryLat && trip.job?.deliveryLng;
  const hasActualRoute = gpsPoints.length > 0;

  const unscheduledStops = detectUnscheduledStops(
    gpsPoints,
    trip.job?.deliveryLat,
    trip.job?.deliveryLng
  );

  const plannedRoute = hasPlannedRoute
    ? interpolatePlannedRoute(
        trip.job!.pickupLat!,
        trip.job!.pickupLng!,
        trip.job!.deliveryLat!,
        trip.job!.deliveryLng!
      )
    : [];

  const actualRoute: [number, number][] = gpsPoints.map((p) => [p.latitude, p.longitude]);

  const routeCompliance = trip.routeCompliancePercent ?? 100;
  const hasDeviations = routeCompliance < 90;
  const hasUnscheduledStops = unscheduledStops.length > 0;

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const defaultCenter: [number, number] = [40.7128, -74.006];
    let center = defaultCenter;
    let zoom = 12;

    if (hasActualRoute) {
      center = actualRoute[0];
    } else if (hasPlannedRoute) {
      center = plannedRoute[0];
    }

    const map = L.map(containerRef.current).setView(center, zoom);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const bounds: [number, number][] = [];

    const startIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(217, 91%, 60%);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
      ">A</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const endIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(142, 76%, 36%);
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
      ">B</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const stopIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(38, 92%, 50%);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const photoIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: hsl(262, 83%, 58%);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (hasPlannedRoute && showPlanned) {
      L.marker([trip.job!.pickupLat!, trip.job!.pickupLng!], { icon: startIcon })
        .bindPopup(`<b>Pickup (Start)</b><br/>${trip.job!.pickupAddress || 'Start location'}`)
        .addTo(map);
      bounds.push([trip.job!.pickupLat!, trip.job!.pickupLng!]);

      L.marker([trip.job!.deliveryLat!, trip.job!.deliveryLng!], { icon: endIcon })
        .bindPopup(`<b>Delivery (End)</b><br/>${trip.job!.deliveryAddress || 'End location'}`)
        .addTo(map);
      bounds.push([trip.job!.deliveryLat!, trip.job!.deliveryLng!]);

      L.polyline(plannedRoute, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.7,
        dashArray: '10, 10',
      })
        .bindPopup('Planned Route (Golden Path)')
        .addTo(map);
      bounds.push(...plannedRoute);
    }

    if (hasActualRoute && showActual) {
      L.polyline(actualRoute, {
        color: hasDeviations ? '#ef4444' : '#22c55e',
        weight: 4,
        opacity: 0.9,
      })
        .bindPopup(`Actual Route Driven<br/>Compliance: ${routeCompliance.toFixed(0)}%`)
        .addTo(map);
      bounds.push(...actualRoute);
    }

    if (showStops && unscheduledStops.length > 0) {
      unscheduledStops.forEach((stop, index) => {
        L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
          .bindPopup(`
            <b>Unscheduled Stop #${index + 1}</b><br/>
            Duration: ${stop.duration} minutes<br/>
            Time: ${format(stop.startTime, 'h:mm a')}
          `)
          .addTo(map);
        bounds.push([stop.latitude, stop.longitude]);
      });
    }

    if (showEvents && events.length > 0) {
      events.forEach((event) => {
        if (event.latitude && event.longitude && event.eventType === 'photo') {
          L.marker([event.latitude, event.longitude], { icon: photoIcon })
            .bindPopup(`
              <b>Photo</b><br/>
              ${event.description || 'Photo captured'}<br/>
              ${format(new Date(event.timestamp), 'h:mm a')}
            `)
            .addTo(map);
          bounds.push([event.latitude, event.longitude]);
        }
      });
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
  }, [trip, gpsPoints, events, showPlanned, showActual, showEvents, showStops]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showPlanned ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowPlanned(!showPlanned)}
          className="gap-2"
        >
          <div className="w-3 h-0.5 bg-blue-500" style={{ borderStyle: 'dashed' }} />
          Planned Route
        </Button>
        <Button
          variant={showActual ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowActual(!showActual)}
          className="gap-2"
        >
          <div className={`w-3 h-0.5 ${hasDeviations ? 'bg-red-500' : 'bg-green-500'}`} />
          Actual Route
        </Button>
        <Button
          variant={showStops ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowStops(!showStops)}
          className="gap-2"
        >
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          Stops ({unscheduledStops.length})
        </Button>
        <Button
          variant={showEvents ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowEvents(!showEvents)}
          className="gap-2"
        >
          <Camera className="h-3 w-3 text-purple-500" />
          Photos
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Route className="h-4 w-4" />
              Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {routeCompliance.toFixed(0)}%
            </div>
            <Badge variant={hasDeviations ? 'destructive' : 'default'} className="mt-1">
              {hasDeviations ? 'Deviated' : 'On Route'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Unscheduled Stops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {unscheduledStops.length}
            </div>
            <Badge variant={hasUnscheduledStops ? 'secondary' : 'outline'} className="mt-1">
              {hasUnscheduledStops ? 'Needs Review' : 'None'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-1 bg-blue-500" style={{ borderStyle: 'dashed', borderWidth: '1px' }} />
              <span>Planned</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-1 bg-green-500" />
              <span>Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-1 bg-red-500" />
              <span>Deviated</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Stop</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Photo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        ref={containerRef}
        className="h-[400px] w-full rounded-lg border"
        data-testid="route-confrontation-map"
      />

      {unscheduledStops.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Unscheduled Stops Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unscheduledStops.map((stop, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span>Stop at {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {stop.duration} min
                    </span>
                    <span>{format(stop.startTime, 'h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
