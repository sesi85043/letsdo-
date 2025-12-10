import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, Upload, Check, X, Loader2, Car, Fuel, Gauge, MapPin, Clock } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { getAuthHeaders } from '@/lib/auth';

interface PhotoSlot {
  position: 'front' | 'back' | 'left' | 'right';
  label: string;
  file: File | null;
  preview: string | null;
  uploaded: boolean;
  url: string | null;
  latitude: number | null;
  longitude: number | null;
  timestamp: Date | null;
}

interface VehicleInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  driverId: string;
  vehicleName: string;
  currentOdometer: number;
  onComplete: () => void;
}

export function VehicleInspectionDialog({
  open,
  onOpenChange,
  vehicleId,
  driverId,
  vehicleName,
  currentOdometer,
  onComplete,
}: VehicleInspectionDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { position: 'front', label: 'Front View', file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null },
    { position: 'back', label: 'Back View', file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null },
    { position: 'left', label: 'Left Side', file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null },
    { position: 'right', label: 'Right Side', file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null },
  ]);
  const [odometerReading, setOdometerReading] = useState(currentOdometer.toString());
  const [fuelLevel, setFuelLevel] = useState('50');
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const uploadedCount = photos.filter(p => p.uploaded).length;
  const allPhotosUploaded = uploadedCount === 4;
  const progress = (uploadedCount / 4) * 100;

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload photo');
    }
    
    const data = await response.json();
    return data.url;
  };

  const handleFileSelect = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    const captureTimestamp = new Date();
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], file, preview, uploaded: false, timestamp: captureTimestamp };
    setPhotos(newPhotos);

    // Capture geolocation
    let latitude: number | null = null;
    let longitude: number | null = null;
    
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (geoError) {
        console.log('Geolocation not available:', geoError);
      }
    }

    newPhotos[index] = { ...newPhotos[index], latitude, longitude };
    setPhotos([...newPhotos]);

    setIsUploading(true);
    try {
      const url = await uploadPhoto(file);
      newPhotos[index] = { ...newPhotos[index], uploaded: true, url };
      setPhotos([...newPhotos]);
      
      if (index < 3) {
        setCurrentStep(index + 1);
      }
      
      toast({
        title: 'Photo uploaded',
        description: `${newPhotos[index].label} photo saved${latitude ? ' with location' : ''}.`,
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    if (newPhotos[index].preview) {
      URL.revokeObjectURL(newPhotos[index].preview!);
    }
    newPhotos[index] = { ...newPhotos[index], file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null };
    setPhotos(newPhotos);
  };

  const createInspectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/inspections', {
        vehicleId,
        driverId,
        photoFront: photos[0].url,
        photoBack: photos[1].url,
        photoLeft: photos[2].url,
        photoRight: photos[3].url,
        photoFrontLat: photos[0].latitude,
        photoFrontLng: photos[0].longitude,
        photoFrontTimestamp: photos[0].timestamp?.toISOString(),
        photoBackLat: photos[1].latitude,
        photoBackLng: photos[1].longitude,
        photoBackTimestamp: photos[1].timestamp?.toISOString(),
        photoLeftLat: photos[2].latitude,
        photoLeftLng: photos[2].longitude,
        photoLeftTimestamp: photos[2].timestamp?.toISOString(),
        photoRightLat: photos[3].latitude,
        photoRightLng: photos[3].longitude,
        photoRightTimestamp: photos[3].timestamp?.toISOString(),
        odometerReading: parseInt(odometerReading),
        fuelLevel: parseInt(fuelLevel),
        status: 'completed',
        notes: notes || null,
        completedAt: new Date().toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inspections'] });
      toast({
        title: 'Inspection completed',
        description: 'Vehicle inspection has been recorded successfully.',
      });
      onComplete();
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
    setCurrentStep(0);
    setPhotos([
      { position: 'front', label: 'Front View', file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null },
      { position: 'back', label: 'Back View', file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null },
      { position: 'left', label: 'Left Side', file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null },
      { position: 'right', label: 'Right Side', file: null, preview: null, uploaded: false, url: null, latitude: null, longitude: null, timestamp: null },
    ]);
    setOdometerReading(currentOdometer.toString());
    setFuelLevel('50');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!allPhotosUploaded) {
      toast({
        title: 'Photos required',
        description: 'Please upload all 4 vehicle photos before completing the inspection.',
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

    createInspectionMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Daily Vehicle Inspection
          </DialogTitle>
          <DialogDescription>
            Complete the 4-photo inspection for {vehicleName} before starting your trip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{uploadedCount} of 4 photos</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.position} className="space-y-2">
                <Label className="text-sm font-medium">{photo.label}</Label>
                <div
                  className={`relative aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors ${
                    currentStep === index && !photo.uploaded
                      ? 'border-primary bg-primary/5'
                      : photo.uploaded
                      ? 'border-chart-2 bg-chart-2/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                  onClick={() => !photo.uploaded && fileInputRefs.current[index]?.click()}
                  data-testid={`photo-slot-${photo.position}`}
                >
                  <input
                    ref={el => fileInputRefs.current[index] = el}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileSelect(index, e)}
                    data-testid={`input-photo-${photo.position}`}
                  />
                  
                  {photo.preview ? (
                    <>
                      <img
                        src={photo.preview}
                        alt={photo.label}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                        {photo.uploaded ? (
                          <>
                            <div className="flex items-center gap-2 text-white">
                              <Check className="h-5 w-5" />
                              <span className="text-sm font-medium">Uploaded</span>
                            </div>
                            {photo.latitude && photo.longitude && (
                              <div className="flex items-center gap-1 text-white/80 text-xs">
                                <MapPin className="h-3 w-3" />
                                <span>GPS Verified</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        )}
                      </div>
                      {photo.uploaded && (
                        <>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto(index);
                            }}
                            data-testid={`button-remove-photo-${photo.position}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          {photo.timestamp && (
                            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {photo.timestamp.toLocaleTimeString()}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{photo.label}</p>
                        <p className="text-xs text-muted-foreground">Click to upload</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="odometer" className="flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Odometer Reading (km)
              </Label>
              <Input
                id="odometer"
                type="number"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                placeholder={`Current: ${currentOdometer}`}
                data-testid="input-odometer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel" className="flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                Fuel Level (%)
              </Label>
              <Input
                id="fuel"
                type="number"
                min="0"
                max="100"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                placeholder="e.g., 75"
                data-testid="input-fuel-level"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any issues or observations about the vehicle condition..."
              className="resize-none"
              data-testid="input-notes"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allPhotosUploaded || createInspectionMutation.isPending}
            data-testid="button-complete-inspection"
          >
            {createInspectionMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Complete Inspection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
