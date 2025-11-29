import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, pgEnum, real, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'driver', 'technician']);
export const tripStatusEnum = pgEnum('trip_status', ['not_started', 'in_progress', 'delayed', 'completed', 'cancelled']);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'assigned', 'in_progress', 'completed', 'cancelled']);
export const eventTypeEnum = pgEnum('event_type', ['departure', 'arrival', 'delay', 'fuel_stop', 'incident', 'photo', 'inspection', 'other']);
export const vehicleStatusEnum = pgEnum('vehicle_status', ['available', 'in_use', 'maintenance', 'retired']);
export const inspectionStatusEnum = pgEnum('inspection_status', ['pending', 'completed', 'failed']);
export const fuelLogTypeEnum = pgEnum('fuel_log_type', ['start', 'end', 'refuel']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default('driver'),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  registrationNumber: text("registration_number").notNull().unique(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  color: text("color"),
  vin: text("vin"),
  currentOdometer: integer("current_odometer").notNull().default(0),
  fuelType: text("fuel_type").notNull().default('petrol'),
  fuelCapacity: real("fuel_capacity"),
  status: vehicleStatusEnum("status").notNull().default('available'),
  imageUrl: text("image_url"),
  lastServiceDate: timestamp("last_service_date"),
  nextServiceDue: timestamp("next_service_due"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  licenseNumber: text("license_number").notNull(),
  licenseExpiry: timestamp("license_expiry").notNull(),
  assignedVehicleId: varchar("assigned_vehicle_id").references(() => vehicles.id),
  isAvailable: boolean("is_available").notNull().default(true),
  totalTrips: integer("total_trips").notNull().default(0),
  totalDistance: real("total_distance").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  pickupAddress: text("pickup_address").notNull(),
  pickupLat: real("pickup_lat"),
  pickupLng: real("pickup_lng"),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryLat: real("delivery_lat"),
  deliveryLng: real("delivery_lng"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  estimatedDuration: integer("estimated_duration"),
  priority: text("priority").notNull().default('normal'),
  status: jobStatusEnum("status").notNull().default('pending'),
  assignedDriverId: varchar("assigned_driver_id").references(() => drivers.id),
  assignedVehicleId: varchar("assigned_vehicle_id").references(() => vehicles.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id),
  status: tripStatusEnum("status").notNull().default('not_started'),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  startOdometer: integer("start_odometer"),
  endOdometer: integer("end_odometer"),
  distanceTravelled: real("distance_travelled"),
  fuelUsed: real("fuel_used"),
  fuelEfficiency: real("fuel_efficiency"),
  routeCompliancePercent: real("route_compliance_percent"),
  isAfterHours: boolean("is_after_hours").notNull().default(false),
  plannedRoute: jsonb("planned_route"),
  actualRoute: jsonb("actual_route"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tripEvents = pgTable("trip_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id),
  eventType: eventTypeEnum("event_type").notNull(),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  address: text("address"),
  photoUrl: text("photo_url"),
  fuelAmount: real("fuel_amount"),
  fuelCost: real("fuel_cost"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const gpsRoutePoints = pgTable("gps_route_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: real("speed"),
  heading: real("heading"),
  altitude: real("altitude"),
  accuracy: real("accuracy"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const vehicleInspections = pgTable("vehicle_inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  inspectionDate: timestamp("inspection_date").notNull().defaultNow(),
  photoFront: text("photo_front"),
  photoBack: text("photo_back"),
  photoLeft: text("photo_left"),
  photoRight: text("photo_right"),
  odometerReading: integer("odometer_reading"),
  fuelLevel: integer("fuel_level"),
  status: inspectionStatusEnum("status").notNull().default('pending'),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fuelLogs = pgTable("fuel_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => trips.id),
  logType: fuelLogTypeEnum("log_type").notNull(),
  odometerReading: integer("odometer_reading").notNull(),
  fuelLevel: integer("fuel_level").notNull(),
  fuelLiters: real("fuel_liters"),
  fuelCost: real("fuel_cost"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  notes: text("notes"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  driver: one(drivers, {
    fields: [users.id],
    references: [drivers.userId],
  }),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  assignedVehicle: one(vehicles, {
    fields: [drivers.assignedVehicleId],
    references: [vehicles.id],
  }),
  jobs: many(jobs),
  trips: many(trips),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  drivers: many(drivers),
  jobs: many(jobs),
  trips: many(trips),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  assignedDriver: one(drivers, {
    fields: [jobs.assignedDriverId],
    references: [drivers.id],
  }),
  assignedVehicle: one(vehicles, {
    fields: [jobs.assignedVehicleId],
    references: [vehicles.id],
  }),
  trips: many(trips),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  job: one(jobs, {
    fields: [trips.jobId],
    references: [jobs.id],
  }),
  driver: one(drivers, {
    fields: [trips.driverId],
    references: [drivers.id],
  }),
  vehicle: one(vehicles, {
    fields: [trips.vehicleId],
    references: [vehicles.id],
  }),
  events: many(tripEvents),
  gpsPoints: many(gpsRoutePoints),
  fuelLogs: many(fuelLogs),
}));

export const tripEventsRelations = relations(tripEvents, ({ one }) => ({
  trip: one(trips, {
    fields: [tripEvents.tripId],
    references: [trips.id],
  }),
}));

export const gpsRoutePointsRelations = relations(gpsRoutePoints, ({ one }) => ({
  trip: one(trips, {
    fields: [gpsRoutePoints.tripId],
    references: [trips.id],
  }),
}));

export const vehicleInspectionsRelations = relations(vehicleInspections, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleInspections.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [vehicleInspections.driverId],
    references: [drivers.id],
  }),
}));

export const fuelLogsRelations = relations(fuelLogs, ({ one }) => ({
  trip: one(trips, {
    fields: [fuelLogs.tripId],
    references: [trips.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
});

export const insertDriverSchema = createInsertSchema(drivers).omit({
  id: true,
  createdAt: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
});

export const insertTripEventSchema = createInsertSchema(tripEvents).omit({
  id: true,
});

export const insertGpsRoutePointSchema = createInsertSchema(gpsRoutePoints).omit({
  id: true,
});

export const insertVehicleInspectionSchema = createInsertSchema(vehicleInspections).omit({
  id: true,
  createdAt: true,
});

export const insertFuelLogSchema = createInsertSchema(fuelLogs).omit({
  id: true,
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(['admin', 'manager', 'driver', 'technician']).default('driver'),
  phone: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertTripEvent = z.infer<typeof insertTripEventSchema>;
export type TripEvent = typeof tripEvents.$inferSelect;
export type InsertGpsRoutePoint = z.infer<typeof insertGpsRoutePointSchema>;
export type GpsRoutePoint = typeof gpsRoutePoints.$inferSelect;
export type InsertVehicleInspection = z.infer<typeof insertVehicleInspectionSchema>;
export type VehicleInspection = typeof vehicleInspections.$inferSelect;
export type InsertFuelLog = z.infer<typeof insertFuelLogSchema>;
export type FuelLog = typeof fuelLogs.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export type DriverWithUser = Driver & { user: User };
export type JobWithRelations = Job & { assignedDriver?: DriverWithUser | null; assignedVehicle?: Vehicle | null };
export type TripWithRelations = Trip & { 
  job: Job; 
  driver: DriverWithUser; 
  vehicle: Vehicle; 
  events?: TripEvent[];
  gpsPoints?: GpsRoutePoint[];
  fuelLogs?: FuelLog[];
};
export type VehicleInspectionWithRelations = VehicleInspection & {
  vehicle: Vehicle;
  driver: DriverWithUser;
};
