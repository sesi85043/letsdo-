import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Fuel,
  Route,
  Clock,
  Users,
  Truck,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AreaChart,
  Area,
  Legend,
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
  not_started: '#6b7280',
  in_progress: '#3b82f6',
  delayed: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
};

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          {TrendIcon && (
            <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-chart-2' : 'text-destructive'}`}>
              <TrendIcon className="h-4 w-4" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </p>
          <p className="text-sm font-medium text-muted-foreground mt-1">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30');

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics'],
  });

  const tripStatusData = analytics?.tripsByStatus
    ? Object.entries(analytics.tripsByStatus).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: STATUS_COLORS[name] || '#6b7280',
      }))
    : [];

  const mockDailyData = Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM d'),
    trips: Math.floor(Math.random() * 15) + 5,
    distance: Math.floor(Math.random() * 500) + 200,
    fuel: Math.floor(Math.random() * 50) + 20,
  }));

  const mockWeeklyEfficiency = [
    { week: 'Week 1', efficiency: 12.5 },
    { week: 'Week 2', efficiency: 13.2 },
    { week: 'Week 3', efficiency: 11.8 },
    { week: 'Week 4', efficiency: 14.1 },
  ];

  const mockDriverPerformance = [
    { name: 'John D.', trips: 45, distance: 1850, efficiency: 13.2 },
    { name: 'Sarah M.', trips: 38, distance: 1620, efficiency: 12.8 },
    { name: 'Mike T.', trips: 42, distance: 1780, efficiency: 11.9 },
    { name: 'Anna K.', trips: 35, distance: 1450, efficiency: 14.5 },
    { name: 'Chris L.', trips: 40, distance: 1680, efficiency: 13.0 },
  ];

  const completionRate = analytics
    ? ((analytics.completedTrips / Math.max(analytics.totalTrips, 1)) * 100).toFixed(1)
    : '0';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Analytics</h1>
          <p className="text-muted-foreground">Fleet performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40" data-testid="select-date-range">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Trips"
              value={analytics?.totalTrips || 0}
              icon={MapPin}
              trend="up"
              trendValue="+12%"
            />
            <MetricCard
              title="Total Distance"
              value={`${(analytics?.totalDistance || 0).toLocaleString()} km`}
              icon={Route}
              trend="up"
              trendValue="+8%"
            />
            <MetricCard
              title="Avg Fuel Efficiency"
              value={`${(analytics?.avgFuelEfficiency || 0).toFixed(1)} km/L`}
              icon={Fuel}
              trend="up"
              trendValue="+5%"
            />
            <MetricCard
              title="Completion Rate"
              value={`${completionRate}%`}
              icon={BarChart3}
              trend="neutral"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Active Drivers"
              value={analytics?.activeDrivers || 0}
              icon={Users}
            />
            <MetricCard
              title="Active Vehicles"
              value={analytics?.activeVehicles || 0}
              icon={Truck}
            />
            <MetricCard
              title="Completed Trips"
              value={analytics?.completedTrips || 0}
              icon={Clock}
              trend="up"
              trendValue="+15%"
            />
            <MetricCard
              title="In Progress"
              value={analytics?.tripsByStatus?.in_progress || 0}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trip Activity</CardTitle>
            <CardDescription>Daily trips and distance over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockDailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="trips"
                    stackId="1"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.6}
                    name="Trips"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distance Covered</CardTitle>
            <CardDescription>Kilometers traveled per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockDailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
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
                    dot={false}
                    name="Distance (km)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Trip Status Distribution</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {tripStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tripStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
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
                  No data available
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

        <Card>
          <CardHeader>
            <CardTitle>Weekly Fuel Efficiency</CardTitle>
            <CardDescription>Average km/L per week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockWeeklyEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" />
                  <YAxis className="text-xs" domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="efficiency"
                    fill="hsl(var(--chart-3))"
                    radius={[4, 4, 0, 0]}
                    name="Efficiency (km/L)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Drivers</CardTitle>
            <CardDescription>By total distance this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockDriverPerformance.map((driver, index) => (
                <div key={driver.name} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {driver.trips} trips | {driver.efficiency} km/L
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{driver.distance.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">km</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
