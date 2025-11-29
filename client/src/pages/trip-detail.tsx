import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Play,
  Square,
  MapPin,
  Clock,
  Fuel,
  Gauge,
  Route,
  Camera,
  AlertTriangle,
  CheckCircle,
  Plus,
  Loader2,
  Navigation,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { TripWithRelations, TripEvent, DriverWithUser } from '@shared/schema';
import { TripMap } from '@/components/trip-map';
import { Link } from 'wouter';
import { StartTripDialog } from '@/components/start-trip-dialog';
import { EndTripDialog } from '@/components/end-trip-dialog';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  not_started: 'outline',
  in_progress: 'default',
  delayed: 'destructive',
  completed: 'secondary',
  cancelled: 'destructive',
};

const EVENT_ICONS: Record<string, any> = {
  departure: Play,
  arrival: CheckCircle,
  delay: AlertTriangle,
  fuel_stop: Fuel,
  incident: AlertTriangle,
  photo: Camera,
  inspection: CheckCircle,
  other: MapPin,
};

function formatDuration(start?: Date | string | null, end?: Date | string | null): string {
  if (!start) return '-';
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const diff = endDate.getTime() - startDate.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  const { data: trip, isLoading } = useQuery<TripWithRelations>({
    queryKey: ['/api/trips', id],
  });

  const { data: currentDriver } = useQuery<DriverWithUser | null>({
    queryKey: ['/api/drivers/me'],
    enabled: !!user && (user.role === 'driver' || user.role === 'technician'),
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  const addEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', `/api/trips/${id}/events`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', id] });
      setIsEventDialogOpen(false);
      toast({ title: 'Event logged', description: 'The event has been recorded.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleAddEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      eventType: formData.get('eventType'),
      description: formData.get('description'),
      latitude: currentPosition?.lat,
      longitude: currentPosition?.lng,
      fuelAmount: formData.get('fuelAmount') ? parseFloat(formData.get('fuelAmount') as string) : null,
      fuelCost: formData.get('fuelCost') ? parseFloat(formData.get('fuelCost') as string) : null,
    };
    addEventMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Trip not found</h2>
        <p className="text-muted-foreground mb-4">The trip you're looking for doesn't exist.</p>
        <Link href="/trips">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trips
          </Button>
        </Link>
      </div>
    );
  }

  const canManageTrip = user?.role === 'driver' || user?.role === 'technician';
  const isActive = trip.status === 'in_progress';
  const canStart = trip.status === 'not_started' && canManageTrip;
  const canEnd = trip.status === 'in_progress' && canManageTrip;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/trips">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={STATUS_VARIANTS[trip.status]}>
                {trip.status.replace(/_/g, ' ')}
              </Badge>
              {trip.isAfterHours && (
                <Badge variant="outline">After Hours</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-trip-title">
              {trip.job?.title || 'Trip Details'}
            </h1>
            <p className="text-muted-foreground">
              {trip.driver?.user?.firstName} {trip.driver?.user?.lastName} - {trip.vehicle?.registrationNumber}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canStart && (
            <Button
              onClick={() => setIsStartDialogOpen(true)}
              data-testid="button-start-trip"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Trip
            </Button>
          )}
          {canEnd && (
            <Button
              variant="destructive"
              onClick={() => setIsEndDialogOpen(true)}
              data-testid="button-end-trip"
            >
              <Square className="mr-2 h-4 w-4" />
              End Trip
            </Button>
          )}
          {trip.job?.deliveryLat && trip.job?.deliveryLng && (
            <Button
              variant="outline"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${trip.job?.deliveryLat},${trip.job?.deliveryLng}`;
                window.open(url, '_blank');
              }}
              data-testid="button-navigate"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Navigate
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              window.open(`/api/trips/${trip.id}/sheet`, '_blank');
            }}
            data-testid="button-trip-sheet"
          >
            <FileText className="mr-2 h-4 w-4" />
            Trip Sheet
          </Button>
          {isActive && canManageTrip && (
            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-event">
                  <Plus className="mr-2 h-4 w-4" />
                  Log Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Trip Event</DialogTitle>
                  <DialogDescription>
                    Record an event that occurred during this trip.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventType">Event Type</Label>
                    <Select name="eventType" required>
                      <SelectTrigger data-testid="select-event-type">
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="arrival">Arrival</SelectItem>
                        <SelectItem value="delay">Delay</SelectItem>
                        <SelectItem value="fuel_stop">Fuel Stop</SelectItem>
                        <SelectItem value="incident">Incident</SelectItem>
                        <SelectItem value="photo">Photo</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Describe the event..."
                      data-testid="input-event-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuelAmount">Fuel Amount (L)</Label>
                      <Input
                        id="fuelAmount"
                        name="fuelAmount"
                        type="number"
                        step="0.1"
                        data-testid="input-fuel-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuelCost">Fuel Cost</Label>
                      <Input
                        id="fuelCost"
                        name="fuelCost"
                        type="number"
                        step="0.01"
                        data-testid="input-fuel-cost"
                      />
                    </div>
                  </div>
                  {currentPosition && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Navigation className="h-4 w-4" />
                      <span>
                        Location: {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                      </span>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addEventMutation.isPending} data-testid="button-submit-event">
                      {addEventMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Log Event
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Route Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] rounded-lg overflow-hidden">
                <TripMap
                  trip={trip}
                  gpsPoints={trip.gpsPoints || []}
                  currentPosition={currentPosition}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trip Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Duration</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatDuration(trip.startTime, trip.endTime)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Route className="h-4 w-4" />
                    <span className="text-sm">Distance</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {trip.distanceTravelled ? `${trip.distanceTravelled.toFixed(1)} km` : '-'}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Fuel className="h-4 w-4" />
                    <span className="text-sm">Fuel Used</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {trip.fuelUsed ? `${trip.fuelUsed.toFixed(1)} L` : '-'}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gauge className="h-4 w-4" />
                    <span className="text-sm">Fuel Efficiency</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {trip.fuelEfficiency ? `${trip.fuelEfficiency.toFixed(1)} km/L` : '-'}
                  </p>
                </div>
              </div>
              {trip.routeCompliancePercent !== null && trip.routeCompliancePercent !== undefined && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Route Compliance</span>
                    <span className="text-sm font-medium">{trip.routeCompliancePercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={trip.routeCompliancePercent} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Job</p>
                <p className="font-medium">{trip.job?.title}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{trip.job?.customerName}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Vehicle</p>
                <p className="font-medium">
                  {trip.vehicle?.make} {trip.vehicle?.model}
                </p>
                <p className="text-sm text-muted-foreground">{trip.vehicle?.registrationNumber}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Odometer</p>
                <p className="font-medium">
                  Start: {trip.startOdometer?.toLocaleString() || '-'} km
                </p>
                <p className="font-medium">
                  End: {trip.endOdometer?.toLocaleString() || '-'} km
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
              <CardDescription>Events logged during this trip</CardDescription>
            </CardHeader>
            <CardContent>
              {trip.events && trip.events.length > 0 ? (
                <div className="space-y-4">
                  {trip.events.map((event: TripEvent) => {
                    const Icon = EVENT_ICONS[event.eventType] || MapPin;
                    return (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          {event.description && (
                            <p className="text-sm text-muted-foreground truncate">{event.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), 'PPp')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events logged yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {trip && (
        <>
          <StartTripDialog
            open={isStartDialogOpen}
            onOpenChange={setIsStartDialogOpen}
            tripId={trip.id}
            vehicleId={trip.vehicleId}
            driverId={trip.driverId}
            vehicleName={`${trip.vehicle?.make} ${trip.vehicle?.model} (${trip.vehicle?.registrationNumber})`}
            currentOdometer={trip.vehicle?.currentOdometer || 0}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/trips', id] });
            }}
          />
          <EndTripDialog
            open={isEndDialogOpen}
            onOpenChange={setIsEndDialogOpen}
            tripId={trip.id}
            vehicleName={`${trip.vehicle?.make} ${trip.vehicle?.model} (${trip.vehicle?.registrationNumber})`}
            startOdometer={trip.startOdometer || 0}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/trips', id] });
            }}
          />
        </>
      )}
    </div>
  );
}
