import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, generateToken, authMiddleware, roleMiddleware, type AuthRequest } from "./auth";
import { loginSchema, registerSchema, insertJobSchema, insertVehicleSchema, insertTripEventSchema, insertVehicleInspectionSchema, insertFuelLogSchema, type JobWithRelations, type TripWithRelations } from "@shared/schema";
import { calculateRouteCompliance, calculateTotalDistance } from "./route-compliance";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed.'));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  app.post('/api/auth/register', async (req, res) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { email, password, firstName, lastName, phone } = validation.data;
      const role = validation.data.role || 'driver';

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        phone: phone || null,
      });

      if (role === 'driver' || role === 'technician') {
        await storage.createDriver({
          userId: user.id,
          licenseNumber: 'PENDING',
          licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      }

      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createVerificationToken({
        userId: user.id,
        token: verificationCode,
        expiresAt,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] Verification code for ${email}: ${verificationCode}`);
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ 
        user: userWithoutPassword, 
        requiresVerification: true,
        message: 'Please verify your email to continue.' 
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/verify', async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ message: 'Email and verification code are required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.emailVerified) {
        const token = generateToken(user);
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ token, user: userWithoutPassword });
      }

      const verificationToken = await storage.getVerificationTokenByUserAndCode(user.id, code);
      if (!verificationToken) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      if (new Date() > verificationToken.expiresAt) {
        await storage.deleteVerificationToken(verificationToken.id);
        return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
      }

      await storage.verifyUserEmail(user.id);
      await storage.deleteVerificationTokensByUserId(user.id);

      const updatedUser = await storage.getUser(user.id);
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to verify email' });
      }

      const token = generateToken(updatedUser);
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error('Verify error:', error);
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: 'Email is already verified' });
      }

      await storage.deleteVerificationTokensByUserId(user.id);

      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await storage.createVerificationToken({
        userId: user.id,
        token: verificationCode,
        expiresAt,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] New verification code for ${email}: ${verificationCode}`);
      }

      res.json({ message: 'Verification code sent successfully' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Failed to resend verification code' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: validation.error.errors[0].message });
      }

      const { email, password } = validation.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (!user.emailVerified) {
        const { password: _, ...userWithoutPassword } = user;
        return res.json({ 
          user: userWithoutPassword,
          requiresVerification: true,
          message: 'Please verify your email to continue.'
        });
      }

      const token = generateToken(user);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to get user' });
    }
  });

  app.get('/api/vehicles', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error('Get vehicles error:', error);
      res.status(500).json({ message: 'Failed to get vehicles' });
    }
  });

  app.get('/api/vehicles/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Get vehicle error:', error);
      res.status(500).json({ message: 'Failed to get vehicle' });
    }
  });

  app.post('/api/vehicles', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      const vehicle = await storage.createVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (error) {
      console.error('Create vehicle error:', error);
      res.status(500).json({ message: 'Failed to create vehicle' });
    }
  });

  app.patch('/api/vehicles/:id', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      const vehicle = await storage.updateVehicle(req.params.id, req.body);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Update vehicle error:', error);
      res.status(500).json({ message: 'Failed to update vehicle' });
    }
  });

  app.delete('/api/vehicles/:id', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      await storage.deleteVehicle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete vehicle error:', error);
      res.status(500).json({ message: 'Failed to delete vehicle' });
    }
  });

  app.post('/api/vehicles/:id/photo', authMiddleware, roleMiddleware('admin', 'manager', 'technician'), upload.single('photo'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const vehicle = await storage.updateVehicle(req.params.id, { imageUrl });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(vehicle);
    } catch (error) {
      console.error('Upload vehicle photo error:', error);
      res.status(500).json({ message: 'Failed to upload vehicle photo' });
    }
  });

  app.get('/api/drivers', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const drivers = await storage.getDrivers();
      res.json(drivers);
    } catch (error) {
      console.error('Get drivers error:', error);
      res.status(500).json({ message: 'Failed to get drivers' });
    }
  });

  app.get('/api/drivers/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const driver = await storage.getDriverByUserId(req.user!.userId);
      if (!driver) {
        return res.status(404).json({ message: 'Driver profile not found' });
      }
      res.json(driver);
    } catch (error) {
      console.error('Get my driver profile error:', error);
      res.status(500).json({ message: 'Failed to get driver profile' });
    }
  });

  app.get('/api/drivers/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const driver = await storage.getDriver(req.params.id);
      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }
      res.json(driver);
    } catch (error) {
      console.error('Get driver error:', error);
      res.status(500).json({ message: 'Failed to get driver' });
    }
  });

  app.post('/api/drivers', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      const { email, password, firstName, lastName, phone, licenseNumber, licenseExpiry, assignedVehicleId } = req.body;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'driver',
        phone: phone || null,
      });

      const driver = await storage.createDriver({
        userId: user.id,
        licenseNumber,
        licenseExpiry: new Date(licenseExpiry),
        assignedVehicleId: assignedVehicleId || null,
      });

      const driverWithUser = await storage.getDriver(driver.id);
      res.status(201).json(driverWithUser);
    } catch (error) {
      console.error('Create driver error:', error);
      res.status(500).json({ message: 'Failed to create driver' });
    }
  });

  app.patch('/api/drivers/:id', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      const driver = await storage.updateDriver(req.params.id, req.body);
      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }
      res.json(driver);
    } catch (error) {
      console.error('Update driver error:', error);
      res.status(500).json({ message: 'Failed to update driver' });
    }
  });

  app.delete('/api/drivers/:id', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      await storage.deleteDriver(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete driver error:', error);
      res.status(500).json({ message: 'Failed to delete driver' });
    }
  });

  app.get('/api/jobs', authMiddleware, async (req: AuthRequest, res) => {
    try {
      let jobs: JobWithRelations[] = [];
      if (req.user!.role === 'driver' || req.user!.role === 'technician') {
        const driver = await storage.getDriverByUserId(req.user!.userId);
        if (driver) {
          jobs = await storage.getJobsByDriver(driver.id);
        }
      } else {
        jobs = await storage.getJobs();
      }
      res.json(jobs);
    } catch (error) {
      console.error('Get jobs error:', error);
      res.status(500).json({ message: 'Failed to get jobs' });
    }
  });

  app.get('/api/jobs/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({ message: 'Failed to get job' });
    }
  });

  app.post('/api/jobs', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      const job = await storage.createJob({
        ...req.body,
        scheduledDate: new Date(req.body.scheduledDate),
      });

      if (req.body.assignedDriverId && req.body.assignedVehicleId) {
        const driver = await storage.getDriver(req.body.assignedDriverId);
        if (driver) {
          await storage.createTrip({
            jobId: job.id,
            driverId: req.body.assignedDriverId,
            vehicleId: req.body.assignedVehicleId,
            status: 'not_started',
          });
        }
      }

      const jobWithRelations = await storage.getJob(job.id);
      res.status(201).json(jobWithRelations);
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({ message: 'Failed to create job' });
    }
  });

  app.patch('/api/jobs/:id', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      const job = await storage.updateJob(req.params.id, req.body);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      console.error('Update job error:', error);
      res.status(500).json({ message: 'Failed to update job' });
    }
  });

  app.delete('/api/jobs/:id', authMiddleware, roleMiddleware('admin', 'manager'), async (req: AuthRequest, res) => {
    try {
      await storage.deleteJob(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete job error:', error);
      res.status(500).json({ message: 'Failed to delete job' });
    }
  });

  app.get('/api/trips', authMiddleware, async (req: AuthRequest, res) => {
    try {
      let trips: TripWithRelations[] = [];
      if (req.user!.role === 'driver' || req.user!.role === 'technician') {
        const driver = await storage.getDriverByUserId(req.user!.userId);
        if (driver) {
          trips = await storage.getTripsByDriver(driver.id);
        }
      } else {
        trips = await storage.getTrips();
      }
      res.json(trips);
    } catch (error) {
      console.error('Get trips error:', error);
      res.status(500).json({ message: 'Failed to get trips' });
    }
  });

  app.get('/api/trips/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      res.json(trip);
    } catch (error) {
      console.error('Get trip error:', error);
      res.status(500).json({ message: 'Failed to get trip' });
    }
  });

  app.post('/api/trips/:id/start', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      const { startOdometer, latitude, longitude } = req.body;

      const updatedTrip = await storage.updateTrip(req.params.id, {
        status: 'in_progress',
        startTime: new Date(),
        startOdometer: startOdometer || 0,
      });

      await storage.createTripEvent({
        tripId: req.params.id,
        eventType: 'departure',
        description: 'Trip started',
        latitude,
        longitude,
        timestamp: new Date(),
      });

      await storage.updateJob(trip.jobId, { status: 'in_progress' });

      const tripWithRelations = await storage.getTrip(req.params.id);
      res.json(tripWithRelations);
    } catch (error) {
      console.error('Start trip error:', error);
      res.status(500).json({ message: 'Failed to start trip' });
    }
  });

  app.post('/api/trips/:id/end', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      const { endOdometer, latitude, longitude } = req.body;
      const startOdometer = trip.startOdometer || 0;
      const distance = endOdometer - startOdometer;
      const fuelUsed = distance * 0.08;
      const fuelEfficiency = fuelUsed > 0 ? distance / fuelUsed : 0;

      const events = await storage.getTripEvents(req.params.id);
      const actualPath = events
        .filter(e => e.latitude && e.longitude)
        .map(e => ({ lat: e.latitude!, lng: e.longitude! }));

      let routeCompliance = { compliancePercent: 100, maxDeviation: 0, averageDeviation: 0 };
      
      const job = trip.jobId ? await storage.getJob(trip.jobId) : null;
      if (job && job.pickupLat && job.pickupLng && job.deliveryLat && job.deliveryLng && actualPath.length > 0) {
        routeCompliance = calculateRouteCompliance(
          actualPath,
          { lat: job.pickupLat, lng: job.pickupLng },
          { lat: job.deliveryLat, lng: job.deliveryLng }
        );
      }

      const updatedTrip = await storage.updateTrip(req.params.id, {
        status: 'completed',
        endTime: new Date(),
        endOdometer,
        distanceTravelled: distance,
        fuelUsed,
        fuelEfficiency,
        routeCompliancePercent: routeCompliance.compliancePercent,
      });

      await storage.createTripEvent({
        tripId: req.params.id,
        eventType: 'arrival',
        description: `Trip completed. Route compliance: ${routeCompliance.compliancePercent}%`,
        latitude,
        longitude,
        timestamp: new Date(),
      });

      await storage.updateJob(trip.jobId, { status: 'completed' });

      const tripWithRelations = await storage.getTrip(req.params.id);
      res.json(tripWithRelations);
    } catch (error) {
      console.error('End trip error:', error);
      res.status(500).json({ message: 'Failed to end trip' });
    }
  });

  app.get('/api/trips/:id/events', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const events = await storage.getTripEvents(req.params.id);
      res.json(events);
    } catch (error) {
      console.error('Get trip events error:', error);
      res.status(500).json({ message: 'Failed to get trip events' });
    }
  });

  app.get('/api/trips/:id/sheet', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const trip = await storage.getTrip(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      const events = await storage.getTripEvents(req.params.id);
      const fuelLogs = await storage.getFuelLogs(req.params.id);

      const formatDate = (date: Date | string | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString();
      };

      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Trip Sheet - ${trip.vehicle?.registrationNumber || 'N/A'}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 8px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .info-row { display: flex; margin-bottom: 8px; }
    .info-label { font-weight: bold; width: 150px; }
    .signature-box { border: 1px solid #333; height: 60px; margin-top: 10px; }
    .footer { margin-top: 30px; font-size: 12px; text-align: center; color: #666; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>TRIP SHEET</h1>
    <p>Fleet Management System</p>
  </div>

  <div class="section">
    <div class="section-title">TRIP INFORMATION</div>
    <div class="info-row"><span class="info-label">Trip ID:</span> ${trip.id}</div>
    <div class="info-row"><span class="info-label">Status:</span> ${trip.status?.toUpperCase()}</div>
    <div class="info-row"><span class="info-label">Start Time:</span> ${formatDate(trip.startTime)}</div>
    <div class="info-row"><span class="info-label">End Time:</span> ${formatDate(trip.endTime)}</div>
  </div>

  <div class="section">
    <div class="section-title">VEHICLE DETAILS</div>
    <div class="info-row"><span class="info-label">Registration:</span> ${trip.vehicle?.registrationNumber || 'N/A'}</div>
    <div class="info-row"><span class="info-label">Vehicle:</span> ${trip.vehicle?.make || ''} ${trip.vehicle?.model || ''}</div>
    <div class="info-row"><span class="info-label">Start Odometer:</span> ${trip.startOdometer?.toLocaleString() || 'N/A'} km</div>
    <div class="info-row"><span class="info-label">End Odometer:</span> ${trip.endOdometer?.toLocaleString() || 'N/A'} km</div>
    <div class="info-row"><span class="info-label">Distance:</span> ${trip.distanceTravelled?.toLocaleString() || 'N/A'} km</div>
  </div>

  <div class="section">
    <div class="section-title">DRIVER DETAILS</div>
    <div class="info-row"><span class="info-label">Name:</span> ${trip.driver?.user?.firstName || ''} ${trip.driver?.user?.lastName || ''}</div>
    <div class="info-row"><span class="info-label">License #:</span> ${trip.driver?.licenseNumber || 'N/A'}</div>
    <div class="info-row"><span class="info-label">Phone:</span> ${trip.driver?.user?.phone || 'N/A'}</div>
  </div>

  <div class="section">
    <div class="section-title">JOB DETAILS</div>
    <div class="info-row"><span class="info-label">Job Title:</span> ${trip.job?.title || 'N/A'}</div>
    <div class="info-row"><span class="info-label">Pickup:</span> ${trip.job?.pickupAddress || 'N/A'}</div>
    <div class="info-row"><span class="info-label">Delivery:</span> ${trip.job?.deliveryAddress || 'N/A'}</div>
    <div class="info-row"><span class="info-label">Description:</span> ${trip.job?.description || 'N/A'}</div>
  </div>

  <div class="section">
    <div class="section-title">FUEL LOGS</div>
    <table>
      <thead><tr><th>Type</th><th>Odometer</th><th>Fuel Level</th><th>Time</th><th>Notes</th></tr></thead>
      <tbody>
        ${fuelLogs.map(log => `
          <tr>
            <td>${log.logType}</td>
            <td>${log.odometerReading?.toLocaleString() || 'N/A'} km</td>
            <td>${log.fuelLevel || 'N/A'}%</td>
            <td>${formatDate(log.createdAt)}</td>
            <td>${log.notes || '-'}</td>
          </tr>
        `).join('')}
        ${fuelLogs.length === 0 ? '<tr><td colspan="5">No fuel logs recorded</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">TRIP EVENTS</div>
    <table>
      <thead><tr><th>Time</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>
        ${events.map(event => `
          <tr>
            <td>${formatDate(event.timestamp)}</td>
            <td>${event.eventType}</td>
            <td>${event.description || '-'}</td>
          </tr>
        `).join('')}
        ${events.length === 0 ? '<tr><td colspan="3">No events recorded</td></tr>' : ''}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">COMPLIANCE</div>
    <div class="info-row"><span class="info-label">Route Compliance:</span> ${trip.routeCompliancePercent?.toFixed(1) || 'N/A'}%</div>
    <div class="info-row"><span class="info-label">Fuel Efficiency:</span> ${trip.fuelEfficiency?.toFixed(2) || 'N/A'} km/L</div>
  </div>

  <div class="section">
    <div class="section-title">SIGNATURES</div>
    <table>
      <tr><td width="50%">Driver Signature:<div class="signature-box"></div></td>
          <td width="50%">Supervisor Signature:<div class="signature-box"></div></td></tr>
    </table>
  </div>

  <div class="footer">
    Generated on ${new Date().toLocaleString()} | FleetPro Fleet Management System
  </div>
</body>
</html>`;

      res.type('html').send(html);
    } catch (error) {
      console.error('Generate trip sheet error:', error);
      res.status(500).json({ message: 'Failed to generate trip sheet' });
    }
  });

  app.post('/api/trips/:id/events', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const event = await storage.createTripEvent({
        tripId: req.params.id,
        eventType: req.body.eventType,
        description: req.body.description,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        address: req.body.address,
        fuelAmount: req.body.fuelAmount,
        fuelCost: req.body.fuelCost,
        timestamp: new Date(),
      });
      res.status(201).json(event);
    } catch (error) {
      console.error('Create trip event error:', error);
      res.status(500).json({ message: 'Failed to create trip event' });
    }
  });

  app.get('/api/trips/:id/gps', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const gpsPoints = await storage.getGpsRoutePoints(req.params.id);
      res.json(gpsPoints);
    } catch (error) {
      console.error('Get GPS points error:', error);
      res.status(500).json({ message: 'Failed to get GPS points' });
    }
  });

  app.post('/api/trips/:id/gps', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { latitude, longitude, speed, heading, altitude, accuracy } = req.body;
      const point = await storage.createGpsRoutePoint({
        tripId: req.params.id,
        latitude,
        longitude,
        speed,
        heading,
        altitude,
        accuracy,
        timestamp: new Date(),
      });
      res.status(201).json(point);
    } catch (error) {
      console.error('Create GPS point error:', error);
      res.status(500).json({ message: 'Failed to create GPS point' });
    }
  });

  app.post('/api/upload', authMiddleware, upload.single('photo'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  app.get('/api/inspections', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { vehicleId, driverId } = req.query;
      const inspections = await storage.getVehicleInspections(
        vehicleId as string | undefined,
        driverId as string | undefined
      );
      res.json(inspections);
    } catch (error) {
      console.error('Get inspections error:', error);
      res.status(500).json({ message: 'Failed to get inspections' });
    }
  });

  app.get('/api/inspections/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const inspection = await storage.getVehicleInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ message: 'Inspection not found' });
      }
      res.json(inspection);
    } catch (error) {
      console.error('Get inspection error:', error);
      res.status(500).json({ message: 'Failed to get inspection' });
    }
  });

  app.get('/api/inspections/today/:driverId/:vehicleId', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const inspection = await storage.getTodayInspection(req.params.driverId, req.params.vehicleId);
      res.json(inspection || null);
    } catch (error) {
      console.error('Get today inspection error:', error);
      res.status(500).json({ message: 'Failed to get today inspection' });
    }
  });

  app.post('/api/inspections', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const inspection = await storage.createVehicleInspection({
        ...req.body,
        inspectionDate: new Date(),
      });
      res.status(201).json(inspection);
    } catch (error) {
      console.error('Create inspection error:', error);
      res.status(500).json({ message: 'Failed to create inspection' });
    }
  });

  app.patch('/api/inspections/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const inspection = await storage.updateVehicleInspection(req.params.id, req.body);
      if (!inspection) {
        return res.status(404).json({ message: 'Inspection not found' });
      }
      res.json(inspection);
    } catch (error) {
      console.error('Update inspection error:', error);
      res.status(500).json({ message: 'Failed to update inspection' });
    }
  });

  app.get('/api/trips/:id/fuel-logs', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const fuelLogs = await storage.getFuelLogs(req.params.id);
      res.json(fuelLogs);
    } catch (error) {
      console.error('Get fuel logs error:', error);
      res.status(500).json({ message: 'Failed to get fuel logs' });
    }
  });

  app.post('/api/trips/:id/fuel-logs', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { logType, odometerReading, fuelLevel, fuelLiters, fuelCost, latitude, longitude, notes } = req.body;
      
      if (!odometerReading || odometerReading < 0) {
        return res.status(400).json({ message: 'Odometer reading must be a positive number' });
      }
      
      if (fuelLevel !== undefined && fuelLevel !== null && (fuelLevel < 0 || fuelLevel > 100)) {
        return res.status(400).json({ message: 'Fuel level must be between 0 and 100' });
      }

      const fuelLog = await storage.createFuelLog({
        tripId: req.params.id,
        logType,
        odometerReading,
        fuelLevel,
        fuelLiters,
        fuelCost,
        latitude,
        longitude,
        notes,
        timestamp: new Date(),
      });
      res.status(201).json(fuelLog);
    } catch (error) {
      console.error('Create fuel log error:', error);
      res.status(500).json({ message: 'Failed to create fuel log' });
    }
  });

  app.patch('/api/fuel-logs/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const fuelLog = await storage.updateFuelLog(req.params.id, req.body);
      if (!fuelLog) {
        return res.status(404).json({ message: 'Fuel log not found' });
      }
      res.json(fuelLog);
    } catch (error) {
      console.error('Update fuel log error:', error);
      res.status(500).json({ message: 'Failed to update fuel log' });
    }
  });

  app.get('/api/analytics', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ message: 'Failed to get analytics' });
    }
  });

  app.use('/uploads', (await import('express')).static(uploadsDir));

  return httpServer;
}
