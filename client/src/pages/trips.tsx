import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link } from 'wouter';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Fuel,
  Play,
  Square,
  Eye,
  Gauge,
  Route,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { TripWithRelations } from '@shared/schema';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  not_started: 'outline',
  in_progress: 'default',
  delayed: 'destructive',
  completed: 'secondary',
  cancelled: 'destructive',
};

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-muted-foreground',
  in_progress: 'bg-chart-1 animate-pulse',
  delayed: 'bg-chart-5',
  completed: 'bg-chart-2',
  cancelled: 'bg-destructive',
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

function TripCard({ trip }: { trip: TripWithRelations }) {
  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[trip.status]}`} />
            <Badge variant={STATUS_VARIANTS[trip.status]} className="text-xs">
              {trip.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <CardTitle className="text-lg truncate" data-testid={`trip-title-${trip.id}`}>
            {trip.job?.title || 'Trip'}
          </CardTitle>
          <CardDescription>
            {trip.driver?.user?.firstName} {trip.driver?.user?.lastName}
          </CardDescription>
        </div>
        <Link href={`/trips/${trip.id}`}>
          <Button variant="ghost" size="icon" data-testid={`button-view-trip-${trip.id}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatDuration(trip.startTime, trip.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span>{trip.distanceTravelled ? `${trip.distanceTravelled.toFixed(1)} km` : '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span>{trip.fuelUsed ? `${trip.fuelUsed.toFixed(1)} L` : '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span>{trip.fuelEfficiency ? `${trip.fuelEfficiency.toFixed(1)} km/L` : '-'}</span>
          </div>
        </div>

        {trip.routeCompliancePercent !== null && trip.routeCompliancePercent !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Route Compliance</span>
              <span className="font-medium">{trip.routeCompliancePercent.toFixed(0)}%</span>
            </div>
            <Progress value={trip.routeCompliancePercent} className="h-2" />
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
          <Calendar className="h-4 w-4" />
          <span>
            {trip.startTime ? format(new Date(trip.startTime), 'PPp') : 'Not started'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function TripCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

export default function TripsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const { data: trips, isLoading } = useQuery<TripWithRelations[]>({
    queryKey: ['/api/trips'],
  });

  const filteredTrips = trips?.filter((trip) => {
    const matchesSearch =
      trip.job?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.driver?.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.driver?.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-trips-title">Trips</h1>
          <p className="text-muted-foreground">
            {isManagerOrAdmin ? 'Monitor all fleet trips and performance' : 'View your trip history'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search trips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-trips"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="not_started">Not Started</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTrips && filteredTrips.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No trips found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No trips have been recorded yet'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
