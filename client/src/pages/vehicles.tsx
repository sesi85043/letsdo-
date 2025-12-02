import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Filter,
  Truck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Gauge,
  Fuel,
  Calendar,
  Loader2,
  Wrench,
  Camera,
  Upload,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, getAuthHeaders } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import type { Vehicle } from '@shared/schema';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  available: 'default',
  in_use: 'secondary',
  maintenance: 'outline',
  retired: 'destructive',
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-chart-2',
  in_use: 'bg-chart-1',
  maintenance: 'bg-chart-5',
  retired: 'bg-destructive',
};

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
  onUploadPhoto,
  onViewProfile,
}: {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
  onUploadPhoto: (file: File) => void;
  onViewProfile: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(file);
    }
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[vehicle.status]}`} />
            <Badge variant={STATUS_VARIANTS[vehicle.status]} className="text-xs">
              {vehicle.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <CardTitle className="text-lg" data-testid={`vehicle-title-${vehicle.id}`}>
            {vehicle.make} {vehicle.model}
          </CardTitle>
          <CardDescription>{vehicle.registrationNumber}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-vehicle-actions-${vehicle.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewProfile}>
              <Eye className="mr-2 h-4 w-4" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Camera className="mr-2 h-4 w-4" />
              Upload Photo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />
        <div className="flex items-center justify-center py-4">
          {vehicle.imageUrl ? (
            <div className="relative group">
              <img
                src={vehicle.imageUrl}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="h-24 w-24 rounded-lg object-cover"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-1">
                <Truck className="h-8 w-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Photo</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{vehicle.year}</span>
          </div>
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{vehicle.fuelType}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span>{vehicle.currentOdometer?.toLocaleString()} km</span>
          </div>
        </div>

        {vehicle.nextServiceDue && (
          <div className="flex items-center gap-2 text-sm pt-2 border-t">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Next service:</span>
            <span>{format(new Date(vehicle.nextServiceDue), 'PP')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VehicleCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center py-4">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24 col-span-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function VehiclesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
  const canUploadPhoto = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'technician';

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/vehicles', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      setIsCreateOpen(false);
      toast({ title: 'Vehicle added', description: 'The vehicle has been added successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      toast({ title: 'Vehicle deleted', description: 'The vehicle has been removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ vehicleId, file }: { vehicleId: string; file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/vehicles/${vehicleId}/photo`, {
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
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      toast({ title: 'Photo uploaded', description: 'Vehicle photo has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleUploadPhoto = (vehicleId: string, file: File) => {
    if (canUploadPhoto) {
      uploadPhotoMutation.mutate({ vehicleId, file });
    } else {
      toast({ title: 'Permission denied', description: 'You do not have permission to upload photos.', variant: 'destructive' });
    }
  };

  const filteredVehicles = vehicles?.filter((vehicle) => {
    const matchesSearch =
      vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateVehicle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      registrationNumber: formData.get('registrationNumber'),
      make: formData.get('make'),
      model: formData.get('model'),
      year: parseInt(formData.get('year') as string),
      color: formData.get('color') || null,
      vin: formData.get('vin') || null,
      fuelType: formData.get('fuelType'),
      fuelCapacity: formData.get('fuelCapacity') ? parseFloat(formData.get('fuelCapacity') as string) : null,
      currentOdometer: parseInt(formData.get('currentOdometer') as string) || 0,
      status: 'available',
    };
    createMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-vehicles-title">Vehicles</h1>
          <p className="text-muted-foreground">Manage your fleet vehicles</p>
        </div>
        {isManagerOrAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-vehicle">
                <Plus className="mr-2 h-4 w-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Enter the vehicle details to add it to your fleet.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateVehicle} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input id="registrationNumber" name="registrationNumber" required data-testid="input-registration" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN (Optional)</Label>
                    <Input id="vin" name="vin" data-testid="input-vin" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" name="make" placeholder="e.g., Toyota" required data-testid="input-make" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" name="model" placeholder="e.g., Hilux" required data-testid="input-model" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      required
                      data-testid="input-year"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color (Optional)</Label>
                    <Input id="color" name="color" data-testid="input-color" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel Type</Label>
                    <Select name="fuelType" defaultValue="petrol">
                      <SelectTrigger data-testid="select-fuel-type">
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuelCapacity">Fuel Capacity (L)</Label>
                    <Input
                      id="fuelCapacity"
                      name="fuelCapacity"
                      type="number"
                      step="0.1"
                      data-testid="input-fuel-capacity"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="currentOdometer">Current Odometer (km)</Label>
                    <Input
                      id="currentOdometer"
                      name="currentOdometer"
                      type="number"
                      defaultValue="0"
                      required
                      data-testid="input-odometer"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-vehicle">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Vehicle
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-vehicles"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="in_use">In Use</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VehicleCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredVehicles && filteredVehicles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={() => {}}
              onDelete={() => deleteMutation.mutate(vehicle.id)}
              onUploadPhoto={(file) => handleUploadPhoto(vehicle.id, file)}
              onViewProfile={() => navigate(`/vehicles/${vehicle.id}`)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : isManagerOrAdmin
                ? 'Add your first vehicle to get started'
                : 'No vehicles available'}
            </p>
            {isManagerOrAdmin && !searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Vehicle
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
