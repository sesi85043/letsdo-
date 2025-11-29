import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  Users,
  Briefcase,
  MapPin,
  TrendingUp,
  Fuel,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, getAuthHeaders } from '@/lib/auth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsData {
  totalTrips: number;
  completedTrips: number;
  totalDistance: number;
  avgFuelEfficiency: number;
  activeDrivers: number;
  activeVehicles: number;
  tripsByStatus: Record<string, number>;
  recentTrips: any[];
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'hsl(var(--muted-foreground))',
  in_progress: 'hsl(var(--chart-1))',
  delayed: 'hsl(var(--chart-5))',
  completed: 'hsl(var(--chart-2))',
  cancelled: 'hsl(var(--destructive))',
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {trend && (
            <span className={trend === 'up' ? 'text-chart-2' : 'text-destructive'}>
              {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trendValue}
            </span>
          )}
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics'],
  });

  const tripStatusData = analytics?.tripsByStatus
    ? Object.entries(analytics.tripsByStatus).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
        color: STATUS_COLORS[name] || 'hsl(var(--muted))',
      }))
    : [];

  const mockWeeklyData = [
    { day: 'Mon', trips: 12, distance: 450 },
    { day: 'Tue', trips: 15, distance: 520 },
    { day: 'Wed', trips: 18, distance: 680 },
    { day: 'Thu', trips: 14, distance: 490 },
    { day: 'Fri', trips: 20, distance: 750 },
    { day: 'Sat', trips: 8, distance: 280 },
    { day: 'Sun', trips: 5, distance: 180 },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your fleet's performance today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Trips"
              value={analytics?.totalTrips || 0}
              description="All time trips"
              icon={MapPin}
              trend="up"
              trendValue="+12%"
            />
            <StatCard
              title="Active Drivers"
              value={analytics?.activeDrivers || 0}
              description="Available for trips"
              icon={Users}
            />
            <StatCard
              title="Active Vehicles"
              value={analytics?.activeVehicles || 0}
              description="In service"
              icon={Truck}
            />
            <StatCard
              title="Avg Fuel Efficiency"
              value={`${(analytics?.avgFuelEfficiency || 0).toFixed(1)} km/L`}
              description="Across all trips"
              icon={Fuel}
              trend="up"
              trendValue="+5%"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Weekly Trip Activity
            </CardTitle>
            <CardDescription>Number of trips and distance covered this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="trips" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Trips" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Trip Status
            </CardTitle>
            <CardDescription>Distribution of trip statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {tripStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tripStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {tripStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No trip data available
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {tripStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distance Covered
            </CardTitle>
            <CardDescription>Total kilometers traveled this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="distance"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                    name="Distance (km)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Trips
            </CardTitle>
            <CardDescription>Latest completed and ongoing trips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))
              ) : analytics?.recentTrips && analytics.recentTrips.length > 0 ? (
                analytics.recentTrips.slice(0, 5).map((trip: any) => (
                  <div key={trip.id} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {trip.job?.title || 'Trip'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {trip.driver?.user?.firstName} {trip.driver?.user?.lastName}
                      </p>
                    </div>
                    <Badge
                      variant={trip.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {trip.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No recent trips
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
