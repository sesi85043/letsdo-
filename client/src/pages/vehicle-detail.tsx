import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Truck,
  Calendar,
  Fuel,
  Gauge,
  Wrench,
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth, getAuthHeaders } from '@/lib/auth';
import { queryClient } from '@/lib/queryClient';
import type { Vehicle, VehicleInspection, TripWithRelations } from '@shared/schema';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  available: 'default',
  in_use: 'secondary',
  maintenance: 'outline',
  retired: 'destructive',
};

const INSPECTION_STATUS_ICONS = {
  completed: CheckCircle2,
  pending: Clock,
  failed: XCircle,
};

const INSPECTION_STATUS_COLORS = {
  completed: 'text-chart-2',
  pending: 'text-chart-5',
  failed: 'text-destructive',
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUploadPhoto = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';

  const { data: vehicle, isLoading: vehicleLoading } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${id}`],
    enabled: !!id,
  });

  const { data: inspections, isLoading: inspectionsLoading } = useQuery<VehicleInspection[]>({
    queryKey: ['/api/inspections', { vehicleId: id }],
    enabled: !!id,
  });

  const { data: trips, isLoading: tripsLoading } = useQuery<TripWithRelations[]>({
    queryKey: ['/api/trips'],
    enabled: !!id,
  });

  const vehicleTrips = trips?.filter(trip => trip.vehicleId === id) || [];

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/vehicles/${id}/photo`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) {
        throw new Error('Failed to upload photo');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vehicles/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      toast({ title: 'Photo uploaded', description: 'Vehicle photo has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && canUploadPhoto) {
      uploadPhotoMutation.mutate(file);
    }
  };

  if (vehicleLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-1" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[50vh]">
        <Truck className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Vehicle not found</h2>
        <Button variant="outline" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Vehicles
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/vehicles')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{vehicle.make} {vehicle.model}</h1>
          <p className="text-muted-foreground">{vehicle.registrationNumber}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[vehicle.status]} className="ml-auto">
          {vehicle.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Vehicle Photo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              {vehicle.imageUrl ? (
                <img
                  src={vehicle.imageUrl}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Truck className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
            {canUploadPhoto && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPhotoMutation.isPending}
              >
                {uploadPhotoMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                {vehicle.imageUrl ? 'Change Photo' : 'Add Photo'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Year</p>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Fuel className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fuel Type</p>
                  <p className="font-medium capitalize">{vehicle.fuelType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Gauge className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Odometer</p>
                  <p className="font-medium">{vehicle.currentOdometer?.toLocaleString()} km</p>
                </div>
              </div>
              {vehicle.fuelCapacity && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Fuel className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fuel Capacity</p>
                    <p className="font-medium">{vehicle.fuelCapacity} L</p>
                  </div>
                </div>
              )}
              {vehicle.color && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div
                    className="w-5 h-5 rounded-full border"
                    style={{ backgroundColor: vehicle.color.toLowerCase() }}
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">Color</p>
                    <p className="font-medium capitalize">{vehicle.color}</p>
                  </div>
                </div>
              )}
              {vehicle.vin && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">VIN</p>
                    <p className="font-medium font-mono text-xs">{vehicle.vin}</p>
                  </div>
                </div>
              )}
              {vehicle.lastServiceDate && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Service</p>
                    <p className="font-medium">{format(new Date(vehicle.lastServiceDate), 'PP')}</p>
                  </div>
                </div>
              )}
              {vehicle.nextServiceDue && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Wrench className="h-5 w-5 text-chart-5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Next Service Due</p>
                    <p className="font-medium">{format(new Date(vehicle.nextServiceDue), 'PP')}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inspections" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="trips">Trip History</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Inspection History</CardTitle>
              <CardDescription>Recent vehicle inspections</CardDescription>
            </CardHeader>
            <CardContent>
              {inspectionsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : inspections && inspections.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Odometer</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map((inspection) => {
                      const StatusIcon = INSPECTION_STATUS_ICONS[inspection.status as keyof typeof INSPECTION_STATUS_ICONS] || AlertTriangle;
                      const statusColor = INSPECTION_STATUS_COLORS[inspection.status as keyof typeof INSPECTION_STATUS_COLORS] || 'text-muted-foreground';
                      return (
                        <TableRow key={inspection.id}>
                          <TableCell>
                            {format(new Date(inspection.inspectionDate), 'PP')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                              <span className="capitalize">{inspection.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {inspection.odometerReading?.toLocaleString()} km
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {inspection.notes || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No inspections recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trips" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trip History</CardTitle>
              <CardDescription>Recent trips with this vehicle</CardDescription>
            </CardHeader>
            <CardContent>
              {tripsLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : vehicleTrips.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicleTrips.map((trip) => (
                      <TableRow
                        key={trip.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/trips/${trip.id}`)}
                      >
                        <TableCell>
                          {trip.startTime
                            ? format(new Date(trip.startTime), 'PP')
                            : trip.createdAt
                            ? format(new Date(trip.createdAt), 'PP')
                            : '-'}
                        </TableCell>
                        <TableCell>{trip.job?.title || '-'}</TableCell>
                        <TableCell>
                          {trip.driver?.user
                            ? `${trip.driver.user.firstName} ${trip.driver.user.lastName}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {trip.distanceTravelled
                            ? `${trip.distanceTravelled.toLocaleString()} km`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={trip.status === 'completed' ? 'default' : 'secondary'}
                          >
                            {trip.status?.replace(/_/g, ' ') || '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No trips recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
