import { 
  users, vehicles, drivers, jobs, trips, tripEvents, gpsRoutePoints,
  type User, type InsertUser, type Vehicle, type InsertVehicle,
  type Driver, type InsertDriver, type Job, type InsertJob,
  type Trip, type InsertTrip, type TripEvent, type InsertTripEvent,
  type GpsRoutePoint, type InsertGpsRoutePoint,
  type DriverWithUser, type JobWithRelations, type TripWithRelations
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;

  getDrivers(): Promise<DriverWithUser[]>;
  getDriver(id: string): Promise<DriverWithUser | undefined>;
  getDriverByUserId(userId: string): Promise<DriverWithUser | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, data: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<boolean>;

  getJobs(): Promise<JobWithRelations[]>;
  getJob(id: string): Promise<JobWithRelations | undefined>;
  getJobsByDriver(driverId: string): Promise<JobWithRelations[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, data: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;

  getTrips(): Promise<TripWithRelations[]>;
  getTrip(id: string): Promise<TripWithRelations | undefined>;
  getTripsByDriver(driverId: string): Promise<TripWithRelations[]>;
  getTripsByJob(jobId: string): Promise<TripWithRelations[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip | undefined>;

  getTripEvents(tripId: string): Promise<TripEvent[]>;
  createTripEvent(event: InsertTripEvent): Promise<TripEvent>;

  getGpsRoutePoints(tripId: string): Promise<GpsRoutePoint[]>;
  createGpsRoutePoint(point: InsertGpsRoutePoint): Promise<GpsRoutePoint>;
  createGpsRoutePoints(points: InsertGpsRoutePoint[]): Promise<GpsRoutePoint[]>;

  getAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalTrips: number;
    completedTrips: number;
    totalDistance: number;
    avgFuelEfficiency: number;
    activeDrivers: number;
    activeVehicles: number;
    tripsByStatus: Record<string, number>;
    recentTrips: TripWithRelations[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getVehicles(): Promise<Vehicle[]> {
    return db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle || undefined;
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(id: string, data: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const [vehicle] = await db.update(vehicles).set(data).where(eq(vehicles.id, id)).returning();
    return vehicle || undefined;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const result = await db.delete(vehicles).where(eq(vehicles.id, id));
    return true;
  }

  async getDrivers(): Promise<DriverWithUser[]> {
    const result = await db.query.drivers.findMany({
      with: { user: true },
      orderBy: [desc(drivers.createdAt)],
    });
    return result as DriverWithUser[];
  }

  async getDriver(id: string): Promise<DriverWithUser | undefined> {
    const result = await db.query.drivers.findFirst({
      where: eq(drivers.id, id),
      with: { user: true },
    });
    return result as DriverWithUser | undefined;
  }

  async getDriverByUserId(userId: string): Promise<DriverWithUser | undefined> {
    const result = await db.query.drivers.findFirst({
      where: eq(drivers.userId, userId),
      with: { user: true },
    });
    return result as DriverWithUser | undefined;
  }

  async createDriver(insertDriver: InsertDriver): Promise<Driver> {
    const [driver] = await db.insert(drivers).values(insertDriver).returning();
    return driver;
  }

  async updateDriver(id: string, data: Partial<InsertDriver>): Promise<Driver | undefined> {
    const [driver] = await db.update(drivers).set(data).where(eq(drivers.id, id)).returning();
    return driver || undefined;
  }

  async deleteDriver(id: string): Promise<boolean> {
    await db.delete(drivers).where(eq(drivers.id, id));
    return true;
  }

  async getJobs(): Promise<JobWithRelations[]> {
    const result = await db.query.jobs.findMany({
      with: { 
        assignedDriver: { with: { user: true } },
        assignedVehicle: true,
      },
      orderBy: [desc(jobs.createdAt)],
    });
    return result as JobWithRelations[];
  }

  async getJob(id: string): Promise<JobWithRelations | undefined> {
    const result = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: { 
        assignedDriver: { with: { user: true } },
        assignedVehicle: true,
      },
    });
    return result as JobWithRelations | undefined;
  }

  async getJobsByDriver(driverId: string): Promise<JobWithRelations[]> {
    const result = await db.query.jobs.findMany({
      where: eq(jobs.assignedDriverId, driverId),
      with: { 
        assignedDriver: { with: { user: true } },
        assignedVehicle: true,
      },
      orderBy: [desc(jobs.createdAt)],
    });
    return result as JobWithRelations[];
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(insertJob).returning();
    return job;
  }

  async updateJob(id: string, data: Partial<InsertJob>): Promise<Job | undefined> {
    const [job] = await db.update(jobs).set(data).where(eq(jobs.id, id)).returning();
    return job || undefined;
  }

  async deleteJob(id: string): Promise<boolean> {
    await db.delete(jobs).where(eq(jobs.id, id));
    return true;
  }

  async getTrips(): Promise<TripWithRelations[]> {
    const result = await db.query.trips.findMany({
      with: { 
        job: true,
        driver: { with: { user: true } },
        vehicle: true,
        events: true,
      },
      orderBy: [desc(trips.createdAt)],
    });
    return result as TripWithRelations[];
  }

  async getTrip(id: string): Promise<TripWithRelations | undefined> {
    const result = await db.query.trips.findFirst({
      where: eq(trips.id, id),
      with: { 
        job: true,
        driver: { with: { user: true } },
        vehicle: true,
        events: true,
        gpsPoints: true,
      },
    });
    return result as TripWithRelations | undefined;
  }

  async getTripsByDriver(driverId: string): Promise<TripWithRelations[]> {
    const result = await db.query.trips.findMany({
      where: eq(trips.driverId, driverId),
      with: { 
        job: true,
        driver: { with: { user: true } },
        vehicle: true,
        events: true,
      },
      orderBy: [desc(trips.createdAt)],
    });
    return result as TripWithRelations[];
  }

  async getTripsByJob(jobId: string): Promise<TripWithRelations[]> {
    const result = await db.query.trips.findMany({
      where: eq(trips.jobId, jobId),
      with: { 
        job: true,
        driver: { with: { user: true } },
        vehicle: true,
        events: true,
      },
      orderBy: [desc(trips.createdAt)],
    });
    return result as TripWithRelations[];
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const [trip] = await db.insert(trips).values(insertTrip).returning();
    return trip;
  }

  async updateTrip(id: string, data: Partial<InsertTrip>): Promise<Trip | undefined> {
    const [trip] = await db.update(trips).set(data).where(eq(trips.id, id)).returning();
    return trip || undefined;
  }

  async getTripEvents(tripId: string): Promise<TripEvent[]> {
    return db.select().from(tripEvents).where(eq(tripEvents.tripId, tripId)).orderBy(tripEvents.timestamp);
  }

  async createTripEvent(event: InsertTripEvent): Promise<TripEvent> {
    const [tripEvent] = await db.insert(tripEvents).values(event).returning();
    return tripEvent;
  }

  async getGpsRoutePoints(tripId: string): Promise<GpsRoutePoint[]> {
    return db.select().from(gpsRoutePoints).where(eq(gpsRoutePoints.tripId, tripId)).orderBy(gpsRoutePoints.timestamp);
  }

  async createGpsRoutePoint(point: InsertGpsRoutePoint): Promise<GpsRoutePoint> {
    const [gpsPoint] = await db.insert(gpsRoutePoints).values(point).returning();
    return gpsPoint;
  }

  async createGpsRoutePoints(points: InsertGpsRoutePoint[]): Promise<GpsRoutePoint[]> {
    if (points.length === 0) return [];
    return db.insert(gpsRoutePoints).values(points).returning();
  }

  async getAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalTrips: number;
    completedTrips: number;
    totalDistance: number;
    avgFuelEfficiency: number;
    activeDrivers: number;
    activeVehicles: number;
    tripsByStatus: Record<string, number>;
    recentTrips: TripWithRelations[];
  }> {
    const allTrips = await this.getTrips();
    
    let filteredTrips = allTrips;
    if (startDate && endDate) {
      filteredTrips = allTrips.filter(trip => {
        const tripDate = new Date(trip.createdAt);
        return tripDate >= startDate && tripDate <= endDate;
      });
    }

    const completedTrips = filteredTrips.filter(t => t.status === 'completed');
    const totalDistance = completedTrips.reduce((sum, t) => sum + (t.distanceTravelled || 0), 0);
    const avgFuelEfficiency = completedTrips.length > 0
      ? completedTrips.reduce((sum, t) => sum + (t.fuelEfficiency || 0), 0) / completedTrips.length
      : 0;

    const allDrivers = await this.getDrivers();
    const activeDrivers = allDrivers.filter(d => d.isAvailable).length;

    const allVehicles = await this.getVehicles();
    const activeVehicles = allVehicles.filter(v => v.status === 'available' || v.status === 'in_use').length;

    const tripsByStatus: Record<string, number> = {};
    filteredTrips.forEach(t => {
      tripsByStatus[t.status] = (tripsByStatus[t.status] || 0) + 1;
    });

    return {
      totalTrips: filteredTrips.length,
      completedTrips: completedTrips.length,
      totalDistance,
      avgFuelEfficiency,
      activeDrivers,
      activeVehicles,
      tripsByStatus,
      recentTrips: filteredTrips.slice(0, 10),
    };
  }
}

export const storage = new DatabaseStorage();
