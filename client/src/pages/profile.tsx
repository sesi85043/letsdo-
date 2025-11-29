import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  User,
  Car,
  IdCard,
  Calendar,
  MapPin,
  Route,
  Fuel,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import type { DriverWithUser, Vehicle, TripWithRelations, VehicleInspection } from '@shared/schema';

export default function ProfilePage() {
  const { user } = useAuth();
  const isDriverOrTechnician = user?.role === 'driver' || user?.role === 'technician';

  const { data: driver, isLoading: driverLoading, error: driverError } = useQuery<DriverWithUser>({
    queryKey: ['/api/drivers/me'],
    enabled: !!user && isDriverOrTechnician,
    retry: false,
  });

  const { data: vehicle, isLoading: vehicleLoading } = useQuery<Vehicle>({
    queryKey: ['/api/vehicles', driver?.assignedVehicleId],
    enabled: !!driver?.assignedVehicleId,
  });

  const { data: trips, isLoading: tripsLoading } = useQuery<TripWithRelations[]>({
    queryKey: ['/api/trips'],
    enabled: !!user,
  });

  const { data: inspections } = useQuery<VehicleInspection[]>({
    queryKey: ['/api/inspections'],
    enabled: !!driver,
  });

  const isLoading = driverLoading || vehicleLoading || tripsLoading;

  const myTrips = trips?.filter(t => t.driverId === driver?.id) || [];
  const completedTrips = myTrips.filter(t => t.status === 'completed');
  const totalDistance = completedTrips.reduce((sum, t) => sum + (t.distanceTravelled || 0), 0);
  const avgCompliance = completedTrips.length > 0
    ? completedTrips.reduce((sum, t) => sum + (t.routeCompliancePercent || 0), 0) / completedTrips.length
    : 0;

  const licenseExpiry = driver?.licenseExpiry ? new Date(driver.licenseExpiry) : null;
  const daysToExpiry = licenseExpiry ? differenceInDays(licenseExpiry, new Date()) : null;
  const isLicenseExpiring = daysToExpiry !== null && daysToExpiry <= 30;
  const isLicenseExpired = daysToExpiry !== null && daysToExpiry < 0;

  const recentInspections = inspections?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!isDriverOrTechnician) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Profile</h2>
        <p className="text-muted-foreground text-center">
          Welcome, {user?.firstName} {user?.lastName}
        </p>
        <Badge variant="secondary" className="mt-2 capitalize">
          {user?.role}
        </Badge>
        <p className="text-sm text-muted-foreground mt-4">
          Driver profile is only available for drivers and technicians.
        </p>
      </div>
    );
  }

  if (!driver && !driverLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground">
          Your driver profile has not been created yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={driver.user.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {driver.user.firstName[0]}{driver.user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold" data-testid="text-profile-name">
                {driver.user.firstName} {driver.user.lastName}
              </h1>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                <Badge variant="secondary" className="capitalize">
                  {driver.user.role}
                </Badge>
                {driver.isAvailable ? (
                  <Badge variant="default">Available</Badge>
                ) : (
                  <Badge variant="outline">Unavailable</Badge>
                )}
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{driver.user.email}</span>
                </div>
                {driver.user.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{driver.user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">License Status</CardTitle>
            <IdCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-license-number">
              {driver.licenseNumber}
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expires</span>
                <span className={isLicenseExpired ? 'text-destructive' : isLicenseExpiring ? 'text-chart-5' : ''}>
                  {licenseExpiry ? format(licenseExpiry, 'PP') : 'N/A'}
                </span>
              </div>
              {daysToExpiry !== null && (
                <div className={`flex items-center gap-2 text-sm ${isLicenseExpired ? 'text-destructive' : isLicenseExpiring ? 'text-chart-5' : 'text-chart-2'}`}>
                  {isLicenseExpired ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      <span>License expired {Math.abs(daysToExpiry)} days ago</span>
                    </>
                  ) : isLicenseExpiring ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      <span>Expires in {daysToExpiry} days</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Valid for {daysToExpiry} days</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Vehicle</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {vehicle ? (
              <>
                <div className="text-2xl font-bold" data-testid="text-vehicle-name">
                  {vehicle.make} {vehicle.model}
                </div>
                <p className="text-sm text-muted-foreground">{vehicle.registrationNumber}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Odometer</span>
                    <span>{vehicle.currentOdometer?.toLocaleString()} km</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fuel Type</span>
                    <span className="capitalize">{vehicle.fuelType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={vehicle.status === 'available' ? 'default' : 'secondary'} className="capitalize">
                      {vehicle.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No vehicle assigned</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Stats</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedTrips.length}
            </div>
            <p className="text-sm text-muted-foreground">Total trips completed</p>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Distance</span>
                  <span>{totalDistance.toLocaleString()} km</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Route Compliance</span>
                  <span>{avgCompliance.toFixed(0)}%</span>
                </div>
                <Progress value={avgCompliance} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Recent Inspections
            </CardTitle>
            <CardDescription>Your latest vehicle inspections</CardDescription>
          </CardHeader>
          <CardContent>
            {recentInspections.length > 0 ? (
              <div className="space-y-4">
                {recentInspections.map((inspection) => (
                  <div key={inspection.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        inspection.status === 'completed' ? 'bg-chart-2/10' : 'bg-chart-5/10'
                      }`}>
                        {inspection.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-chart-2" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-chart-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(inspection.inspectionDate), 'PPP')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Odometer: {inspection.odometerReading?.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                    <Badge variant={inspection.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                      {inspection.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No inspections recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest trips</CardDescription>
          </CardHeader>
          <CardContent>
            {myTrips.length > 0 ? (
              <div className="space-y-4">
                {myTrips.slice(0, 5).map((trip) => (
                  <div key={trip.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[180px]">
                          {trip.job?.title || 'Trip'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trip.startTime ? format(new Date(trip.startTime), 'PP') : 'Not started'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={trip.status === 'completed' ? 'default' : trip.status === 'in_progress' ? 'secondary' : 'outline'}
                      className="capitalize"
                    >
                      {trip.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No trips recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {vehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Quick Navigation
            </CardTitle>
            <CardDescription>Navigate to your next destination</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
                      window.open(url, '_blank');
                    });
                  }
                }}
                data-testid="button-open-google-maps"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Google Maps
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const url = `https://waze.com/ul?ll=${pos.coords.latitude},${pos.coords.longitude}&navigate=yes`;
                      window.open(url, '_blank');
                    });
                  }
                }}
                data-testid="button-open-waze"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Waze
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
