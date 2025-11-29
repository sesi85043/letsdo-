import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Play, AlertTriangle, CheckCircle, Loader2, Gauge, Fuel, Car, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { VehicleInspectionDialog } from './vehicle-inspection-dialog';
import type { VehicleInspection } from '@shared/schema';

interface StartTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  vehicleId: string;
  driverId: string;
  vehicleName: string;
  currentOdometer: number;
  onSuccess: () => void;
}

export function StartTripDialog({
  open,
  onOpenChange,
  tripId,
  vehicleId,
  driverId,
  vehicleName,
  currentOdometer,
  onSuccess,
}: StartTripDialogProps) {
  const { toast } = useToast();
  const [odometerReading, setOdometerReading] = useState(currentOdometer.toString());
  const [fuelLevel, setFuelLevel] = useState('');
  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

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

  const { data: todayInspection, isLoading: inspectionLoading, refetch: refetchInspection } = useQuery<VehicleInspection | null>({
    queryKey: [`/api/inspections/today/${driverId}/${vehicleId}`],
    enabled: open && !!driverId && !!vehicleId,
  });

  const hasValidInspection = todayInspection?.status === 'completed';

  const startTripMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/trips/${tripId}/start`, {
        startOdometer: parseInt(odometerReading),
        latitude: currentPosition?.lat,
        longitude: currentPosition?.lng,
      });
      
      await apiRequest('POST', `/api/trips/${tripId}/fuel-logs`, {
        logType: 'start',
        odometerReading: parseInt(odometerReading),
        fuelLevel: parseInt(fuelLevel),
        latitude: currentPosition?.lat,
        longitude: currentPosition?.lng,
      });

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId] });
      toast({
        title: 'Trip started',
        description: 'Your trip has begun. Drive safely!',
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleStartTrip = () => {
    if (!hasValidInspection) {
      toast({
        title: 'Inspection required',
        description: 'Please complete the daily vehicle inspection before starting your trip.',
        variant: 'destructive',
      });
      return;
    }

    if (!odometerReading || parseInt(odometerReading) < currentOdometer) {
      toast({
        title: 'Invalid odometer',
        description: 'Odometer reading must be valid and not less than current reading.',
        variant: 'destructive',
      });
      return;
    }

    if (!fuelLevel || parseInt(fuelLevel) < 0 || parseInt(fuelLevel) > 100) {
      toast({
        title: 'Invalid fuel level',
        description: 'Please enter a valid fuel level between 0 and 100.',
        variant: 'destructive',
      });
      return;
    }

    startTripMutation.mutate();
  };

  const handleInspectionComplete = () => {
    refetchInspection();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Start Trip
            </DialogTitle>
            <DialogDescription>
              Enter your starting readings for {vehicleName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {inspectionLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasValidInspection ? (
              <Alert className="border-chart-2/50 bg-chart-2/10">
                <CheckCircle className="h-4 w-4 text-chart-2" />
                <AlertTitle className="text-chart-2">Inspection Completed</AlertTitle>
                <AlertDescription>
                  Daily vehicle inspection was completed today. You can proceed to start the trip.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-chart-5/50 bg-chart-5/10">
                <AlertTriangle className="h-4 w-4 text-chart-5" />
                <AlertTitle className="text-chart-5">Inspection Required</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>You must complete the daily 4-photo vehicle inspection before starting your trip.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInspectionDialog(true)}
                    className="w-full"
                    data-testid="button-start-inspection"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start Vehicle Inspection
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="start-odometer" className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Odometer Reading (km)
                </Label>
                <Input
                  id="start-odometer"
                  type="number"
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                  placeholder={`Current: ${currentOdometer}`}
                  data-testid="input-start-odometer"
                />
                <p className="text-xs text-muted-foreground">
                  Current vehicle odometer: {currentOdometer.toLocaleString()} km
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-fuel" className="flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  Fuel Level (%)
                </Label>
                <Input
                  id="start-fuel"
                  type="number"
                  min="0"
                  max="100"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  placeholder="Enter fuel gauge level (0-100)"
                  data-testid="input-start-fuel"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartTrip}
              disabled={!hasValidInspection || startTripMutation.isPending}
              data-testid="button-confirm-start-trip"
            >
              {startTripMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VehicleInspectionDialog
        open={showInspectionDialog}
        onOpenChange={setShowInspectionDialog}
        vehicleId={vehicleId}
        driverId={driverId}
        vehicleName={vehicleName}
        currentOdometer={currentOdometer}
        onComplete={handleInspectionComplete}
      />
    </>
  );
}
