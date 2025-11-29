import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Square, Loader2, Gauge, Fuel, AlertTriangle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface EndTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  vehicleName: string;
  startOdometer: number;
  onSuccess: () => void;
}

export function EndTripDialog({
  open,
  onOpenChange,
  tripId,
  vehicleName,
  startOdometer,
  onSuccess,
}: EndTripDialogProps) {
  const { toast } = useToast();
  const [odometerReading, setOdometerReading] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');
  const [notes, setNotes] = useState('');
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  const estimatedDistance = odometerReading ? parseInt(odometerReading) - startOdometer : 0;
  const isValidDistance = estimatedDistance >= 0;

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

  const endTripMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/trips/${tripId}/end`, {
        endOdometer: parseInt(odometerReading),
        latitude: currentPosition?.lat,
        longitude: currentPosition?.lng,
      });
      
      await apiRequest('POST', `/api/trips/${tripId}/fuel-logs`, {
        logType: 'end',
        odometerReading: parseInt(odometerReading),
        fuelLevel: parseInt(fuelLevel),
        latitude: currentPosition?.lat,
        longitude: currentPosition?.lng,
        notes: notes || null,
      });

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId] });
      toast({
        title: 'Trip completed',
        description: 'Your trip has been recorded successfully.',
      });
      onSuccess();
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setOdometerReading('');
    setFuelLevel('');
    setNotes('');
  };

  const handleEndTrip = () => {
    if (!odometerReading || parseInt(odometerReading) < startOdometer) {
      toast({
        title: 'Invalid odometer',
        description: 'Odometer reading must be greater than or equal to the start reading.',
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

    endTripMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Square className="h-5 w-5" />
            End Trip
          </DialogTitle>
          <DialogDescription>
            Enter your final readings for {vehicleName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="end-odometer" className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Odometer Reading (km)
              </Label>
              <Input
                id="end-odometer"
                type="number"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                placeholder={`Must be >= ${startOdometer}`}
                data-testid="input-end-odometer"
              />
              <p className="text-xs text-muted-foreground">
                Start odometer: {startOdometer.toLocaleString()} km
              </p>
            </div>

            {odometerReading && (
              <div className={`rounded-lg p-3 ${isValidDistance ? 'bg-muted' : 'bg-destructive/10'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Distance traveled:</span>
                  <span className={`font-medium ${isValidDistance ? '' : 'text-destructive'}`}>
                    {isValidDistance ? `${estimatedDistance.toLocaleString()} km` : 'Invalid reading'}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="end-fuel" className="flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                Fuel Level (%)
              </Label>
              <Input
                id="end-fuel"
                type="number"
                min="0"
                max="100"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                placeholder="Enter fuel gauge level (0-100)"
                data-testid="input-end-fuel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-notes">Notes (Optional)</Label>
              <Textarea
                id="end-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any issues or observations during the trip..."
                className="resize-none"
                data-testid="input-end-notes"
              />
            </div>
          </div>

          {!isValidDistance && odometerReading && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The odometer reading cannot be less than the starting value.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleEndTrip}
            disabled={!isValidDistance || !odometerReading || !fuelLevel || endTripMutation.isPending}
            data-testid="button-confirm-end-trip"
          >
            {endTripMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Square className="mr-2 h-4 w-4" />
            )}
            End Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
