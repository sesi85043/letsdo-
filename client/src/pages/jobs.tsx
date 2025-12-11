import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Calendar,
  User,
  Truck,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Briefcase,
  Navigation,
  ExternalLink,
  Map,
  LayoutGrid,
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth, getAuthHeaders } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { JobsMap } from '@/components/jobs-map';
import type { JobWithRelations, DriverWithUser, Vehicle } from '@shared/schema';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary',
  assigned: 'outline',
  in_progress: 'default',
  completed: 'default',
  cancelled: 'destructive',
};

const PRIORITY_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  low: 'outline',
  normal: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

function JobCard({ job, onEdit, onDelete }: { job: JobWithRelations; onEdit: () => void; onDelete: () => void }) {
  const openWazeNavigationToDelivery = () => {
    if (job.deliveryLat && job.deliveryLng) {
      const url = `https://waze.com/ul?ll=${job.deliveryLat},${job.deliveryLng}&navigate=yes`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (job.deliveryAddress) {
      const url = `https://waze.com/ul?q=${encodeURIComponent(job.deliveryAddress)}&navigate=yes`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openWazeNavigationToPickup = () => {
    if (job.pickupLat && job.pickupLng) {
      const url = `https://waze.com/ul?ll=${job.pickupLat},${job.pickupLng}&navigate=yes`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (job.pickupAddress) {
      const url = `https://waze.com/ul?q=${encodeURIComponent(job.pickupAddress)}&navigate=yes`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openGoogleNavigationToDelivery = () => {
    if (job.deliveryLat && job.deliveryLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${job.deliveryLat},${job.deliveryLng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (job.deliveryAddress) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.deliveryAddress)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const openGoogleNavigationToPickup = () => {
    if (job.pickupLat && job.pickupLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${job.pickupLat},${job.pickupLng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (job.pickupAddress) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.pickupAddress)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={STATUS_VARIANTS[job.status]} className="text-xs">
              {job.status.replace(/_/g, ' ')}
            </Badge>
            <Badge variant={PRIORITY_VARIANTS[job.priority]} className="text-xs">
              {job.priority}
            </Badge>
          </div>
          <CardTitle className="text-lg truncate" data-testid={`job-title-${job.id}`}>
            {job.title}
          </CardTitle>
          <CardDescription className="truncate">{job.customerName}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-job-actions-${job.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openWazeNavigationToPickup}>
              <Navigation className="mr-2 h-4 w-4" />
              Waze to Pickup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openWazeNavigationToDelivery}>
              <Navigation className="mr-2 h-4 w-4 text-chart-2" />
              Waze to Client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openGoogleNavigationToPickup}>
              <MapPin className="mr-2 h-4 w-4" />
              Google Maps to Pickup
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openGoogleNavigationToDelivery}>
              <MapPin className="mr-2 h-4 w-4 text-chart-2" />
              Google Maps to Client
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
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 text-sm group">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Pickup</p>
            <p className="text-muted-foreground truncate">{job.pickupAddress}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={openWazeNavigationToPickup}
            title="Navigate to pickup with Waze"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-start gap-2 text-sm group">
          <MapPin className="h-4 w-4 mt-0.5 text-chart-2 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Client Location</p>
            <p className="text-muted-foreground truncate">{job.deliveryAddress}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={openWazeNavigationToDelivery}
            title="Navigate to client with Waze"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{format(new Date(job.scheduledDate), 'PPp')}</span>
        </div>
        {job.assignedDriver && (
          <div className="flex items-center gap-2 text-sm pt-2 border-t">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              {job.assignedDriver.user.firstName} {job.assignedDriver.user.lastName}
            </span>
          </div>
        )}
        {job.assignedVehicle && (
          <div className="flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span>
              {job.assignedVehicle.make} {job.assignedVehicle.model} ({job.assignedVehicle.registrationNumber})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

function EditJobDialog({
  job,
  onClose,
  drivers,
  vehicles,
  isManagerOrAdmin,
}: {
  job: JobWithRelations;
  onClose: () => void;
  drivers: DriverWithUser[];
  vehicles: Vehicle[];
  isManagerOrAdmin: boolean;
}) {
  const { toast } = useToast();
  const [editDriverId, setEditDriverId] = useState<string | null>(job.assignedDriverId || null);
  const [editVehicleId, setEditVehicleId] = useState<string | null>(job.assignedVehicleId || null);
  const [editStatus, setEditStatus] = useState<string>(job.status);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isManagerOrAdmin) {
        const res = await apiRequest('PATCH', `/api/jobs/${job.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest('POST', `/api/jobs/${job.id}/driver-update`, { status: data.status });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
      onClose();
      toast({ title: 'Job updated', description: 'The job has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleUpdateJob = () => {
    if (isManagerOrAdmin) {
      const data: any = {
        assignedDriverId: editDriverId || null,
        assignedVehicleId: editVehicleId || null,
        status: editStatus,
      };
      if (editDriverId && !job.assignedDriverId) {
        data.status = 'assigned';
      }
      updateMutation.mutate(data);
    } else {
      updateMutation.mutate({ status: editStatus });
    }
  };

  const openWazeToPickup = () => {
    if (job.pickupLat && job.pickupLng) {
      window.open(`https://waze.com/ul?ll=${job.pickupLat},${job.pickupLng}&navigate=yes`, '_blank');
    } else if (job.pickupAddress) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(job.pickupAddress)}&navigate=yes`, '_blank');
    }
  };

  const openWazeToDelivery = () => {
    if (job.deliveryLat && job.deliveryLng) {
      window.open(`https://waze.com/ul?ll=${job.deliveryLat},${job.deliveryLng}&navigate=yes`, '_blank');
    } else if (job.deliveryAddress) {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(job.deliveryAddress)}&navigate=yes`, '_blank');
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isManagerOrAdmin ? 'Edit Job' : 'Job Details'}</DialogTitle>
          <DialogDescription>
            {isManagerOrAdmin ? `Update assignments and status for "${job.title}"` : `View details for "${job.title}"`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANTS[job.status]} className="text-xs">
              {job.status.replace(/_/g, ' ')}
            </Badge>
            <Badge variant={PRIORITY_VARIANTS[job.priority]} className="text-xs">
              {job.priority}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Job Title</Label>
              <p className="font-medium">{job.title}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Customer</Label>
              <p className="font-medium">{job.customerName}</p>
              {job.customerPhone && <p className="text-sm text-muted-foreground">{job.customerPhone}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Pickup Location</Label>
              <p className="text-sm">{job.pickupAddress}</p>
              <Button variant="outline" size="sm" onClick={openWazeToPickup} className="mt-1">
                <Navigation className="mr-2 h-4 w-4" />
                Navigate with Waze
              </Button>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Client Location</Label>
              <p className="text-sm">{job.deliveryAddress}</p>
              <Button variant="outline" size="sm" onClick={openWazeToDelivery} className="mt-1">
                <Navigation className="mr-2 h-4 w-4" />
                Navigate with Waze
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Scheduled Date</Label>
            <p className="text-sm">{format(new Date(job.scheduledDate), 'PPpp')}</p>
          </div>

          {job.description && (
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Description</Label>
              <p className="text-sm">{job.description}</p>
            </div>
          )}

          {isManagerOrAdmin && (
            <>
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold">Assignments</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Assign Driver</Label>
                    <Select
                      value={editDriverId || "unassigned"}
                      onValueChange={(v) => setEditDriverId(v === "unassigned" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.user.firstName} {driver.user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign Vehicle</Label>
                    <Select
                      value={editVehicleId || "unassigned"}
                      onValueChange={(v) => setEditVehicleId(v === "unassigned" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {vehicles.filter((v) => v.status === 'available' || v.id === job.assignedVehicleId).map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.make} {vehicle.model} ({vehicle.registrationNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {!isManagerOrAdmin && (
            <div className="border-t pt-4 space-y-4">
              {job.assignedDriver && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Driver:</span>
                  <span>{job.assignedDriver.user.firstName} {job.assignedDriver.user.lastName}</span>
                </div>
              )}
              {job.assignedVehicle && (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Vehicle:</span>
                  <span>{job.assignedVehicle.make} {job.assignedVehicle.model}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Update Job Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {isManagerOrAdmin ? (
            <Button onClick={handleUpdateJob} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          ) : (
            <Button onClick={handleUpdateJob} disabled={updateMutation.isPending || editStatus === job.status}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function JobsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobWithRelations | null>(null);
  const [newAssignedDriverId, setNewAssignedDriverId] = useState<string | null>(null);
  const [newAssignedVehicleId, setNewAssignedVehicleId] = useState<string | null>(null);

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const { data: jobs, isLoading } = useQuery<JobWithRelations[]>({
    queryKey: ['/api/jobs'],
  });

  const { data: drivers } = useQuery<DriverWithUser[]>({
    queryKey: ['/api/drivers'],
    enabled: isManagerOrAdmin,
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles'],
    enabled: isManagerOrAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/jobs', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      setIsCreateOpen(false);
      toast({ title: 'Job created', description: 'The job has been created successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({ title: 'Job deleted', description: 'The job has been deleted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filteredJobs = jobs?.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateJob = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      customerName: formData.get('customerName'),
      customerPhone: formData.get('customerPhone'),
      customerEmail: formData.get('customerEmail'),
      pickupAddress: formData.get('pickupAddress'),
      deliveryAddress: formData.get('deliveryAddress'),
      scheduledDate: new Date(formData.get('scheduledDate') as string).toISOString(),
      priority: formData.get('priority'),
      description: formData.get('description'),
      assignedDriverId: newAssignedDriverId ?? (formData.get('assignedDriverId') as string | null) ?? null,
      assignedVehicleId: newAssignedVehicleId ?? (formData.get('assignedVehicleId') as string | null) ?? null,
      status: (newAssignedDriverId ?? (formData.get('assignedDriverId') as string | null)) ? 'assigned' : 'pending',
    };
    createMutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-jobs-title">Jobs</h1>
          <p className="text-muted-foreground">
            {isManagerOrAdmin ? 'Manage and assign jobs to drivers' : 'View your assigned jobs'}
          </p>
        </div>
        {isManagerOrAdmin && (
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open);
              if (!open) {
                setNewAssignedDriverId(null);
                setNewAssignedVehicleId(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-create-job">
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Job</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new job assignment.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input id="title" name="title" required data-testid="input-job-title" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input id="customerName" name="customerName" required data-testid="input-customer-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input id="customerPhone" name="customerPhone" type="tel" data-testid="input-customer-phone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input id="customerEmail" name="customerEmail" type="email" data-testid="input-customer-email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupAddress">Pickup Address</Label>
                  <Input id="pickupAddress" name="pickupAddress" required data-testid="input-pickup-address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <Input id="deliveryAddress" name="deliveryAddress" required data-testid="input-delivery-address" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Scheduled Date & Time</Label>
                    <Input
                      id="scheduledDate"
                      name="scheduledDate"
                      type="datetime-local"
                      required
                      data-testid="input-scheduled-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="normal">
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assignedDriverId">Assign Driver (Optional)</Label>
                    <Select
                      name="assignedDriverId"
                      value={newAssignedDriverId ?? undefined}
                      onValueChange={(v) => setNewAssignedDriverId(v ?? null)}
                    >
                      <SelectTrigger data-testid="select-driver">
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers?.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.user.firstName} {driver.user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignedVehicleId">Assign Vehicle (Optional)</Label>
                    <Select
                      name="assignedVehicleId"
                      value={newAssignedVehicleId ?? undefined}
                      onValueChange={(v) => setNewAssignedVehicleId(v ?? null)}
                    >
                      <SelectTrigger data-testid="select-vehicle">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles?.filter((v) => v.status === 'available').map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.make} {vehicle.model} ({vehicle.registrationNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea id="description" name="description" data-testid="input-description" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-job">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Job
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {editingJob && (
          <EditJobDialog
            job={editingJob}
            onClose={() => setEditingJob(null)}
            drivers={drivers || []}
            vehicles={vehicles || []}
            isManagerOrAdmin={isManagerOrAdmin}
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-jobs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'map')}>
          <TabsList>
            <TabsTrigger value="grid" data-testid="button-grid-view">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="map" data-testid="button-map-view">
              <Map className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <JobsMap 
              jobs={filteredJobs || []} 
              onJobClick={(job) => setEditingJob(job)}
            />
          </CardContent>
        </Card>
      ) : filteredJobs && filteredJobs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={() => setEditingJob(job)}
              onDelete={() => deleteMutation.mutate(job.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : isManagerOrAdmin
                ? 'Create your first job to get started'
                : 'No jobs have been assigned to you yet'}
            </p>
            {isManagerOrAdmin && !searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
