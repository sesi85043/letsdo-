/**
 * Mock in-memory database for local development/testing.
 * Mimics the Drizzle ORM interface for users, drivers, vehicles, jobs, trips, etc.
 * Data is not persisted across server restarts.
 */

import * as schema from "@shared/schema";

interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  createdAt: Date;
}

interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseExpiry: Date;
  assignedVehicleId?: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  status: string;
}

interface Job {
  id: string;
  title: string;
  pickupLocation: string;
  deliveryLocation: string;
  status: string;
}

interface Trip {
  id: string;
  driverId: string;
  vehicleId: string;
  jobId?: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
}

interface TripEvent {
  id: string;
  tripId: string;
  eventType: string;
  timestamp: Date;
  description?: string;
}

// In-memory storage
const db = {
  users: new Map<string, User>(),
  drivers: new Map<string, Driver>(),
  vehicles: new Map<string, Vehicle>(),
  jobs: new Map<string, Job>(),
  trips: new Map<string, Trip>(),
  tripEvents: new Map<string, TripEvent>(),
};

export const mockDb = {
  // User operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of db.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  },

  async getUserById(id: string): Promise<User | undefined> {
    return db.users.get(id);
  },

  async createUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const user: User = {
      id,
      ...data,
      createdAt: new Date(),
    };
    db.users.set(id, user);
    return user;
  },

  // Driver operations
  async getDriverByUserId(userId: string): Promise<Driver | undefined> {
    for (const driver of db.drivers.values()) {
      if (driver.userId === userId) return driver;
    }
    return undefined;
  },

  async getDriverById(id: string): Promise<Driver | undefined> {
    return db.drivers.get(id);
  },

  async createDriver(data: Omit<Driver, "id">): Promise<Driver> {
    const id = `driver_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const driver: Driver = { id, ...data };
    db.drivers.set(id, driver);
    return driver;
  },

  // Vehicle operations
  async getAllVehicles(): Promise<Vehicle[]> {
    return Array.from(db.vehicles.values());
  },

  async getVehicleById(id: string): Promise<Vehicle | undefined> {
    return db.vehicles.get(id);
  },

  async createVehicle(data: Omit<Vehicle, "id">): Promise<Vehicle> {
    const id = `vehicle_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const vehicle: Vehicle = { id, ...data };
    db.vehicles.set(id, vehicle);
    return vehicle;
  },

  // Job operations
  async getAllJobs(): Promise<Job[]> {
    return Array.from(db.jobs.values());
  },

  async getJobById(id: string): Promise<Job | undefined> {
    return db.jobs.get(id);
  },

  async createJob(data: Omit<Job, "id">): Promise<Job> {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const job: Job = { id, ...data };
    db.jobs.set(id, job);
    return job;
  },

  // Trip operations
  async getAllTrips(): Promise<Trip[]> {
    return Array.from(db.trips.values());
  },

  async getTripById(id: string): Promise<Trip | undefined> {
    return db.trips.get(id);
  },

  async getTripsByDriver(driverId: string): Promise<Trip[]> {
    return Array.from(db.trips.values()).filter(t => t.driverId === driverId);
  },

  async createTrip(data: Omit<Trip, "id">): Promise<Trip> {
    const id = `trip_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const trip: Trip = { id, ...data };
    db.trips.set(id, trip);
    return trip;
  },

  async updateTrip(id: string, data: Partial<Trip>): Promise<Trip | undefined> {
    const trip = db.trips.get(id);
    if (!trip) return undefined;
    const updated = { ...trip, ...data };
    db.trips.set(id, updated);
    return updated;
  },

  // Trip Event operations
  async getTripEvents(tripId: string): Promise<TripEvent[]> {
    return Array.from(db.tripEvents.values()).filter(e => e.tripId === tripId);
  },

  async createTripEvent(data: Omit<TripEvent, "id">): Promise<TripEvent> {
    const id = `event_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const event: TripEvent = { id, ...data };
    db.tripEvents.set(id, event);
    return event;
  },

  // Utility: clear all data (for testing)
  async clear(): Promise<void> {
    db.users.clear();
    db.drivers.clear();
    db.vehicles.clear();
    db.jobs.clear();
    db.trips.clear();
    db.tripEvents.clear();
  },
};
