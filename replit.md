# FleetPro - Fleet Management System

## Overview
FleetPro is a comprehensive fleet management system for managing vehicles, drivers, trips, and jobs. It provides real-time tracking, vehicle inspections, fuel logging, and route compliance monitoring.

## Project Architecture
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with Passport.js

## Project Structure
```
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and helpers
│   │   └── pages/        # Page components
│   └── index.html
├── server/               # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── db.ts             # Database connection
│   └── storage.ts        # Data storage layer
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle schema definitions
└── uploads/              # File uploads directory
```

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run db:push` - Push schema changes to database

## Database
Uses Replit's built-in PostgreSQL database. The schema includes:
- Users and authentication
- Vehicles and drivers
- Jobs and trips
- GPS route tracking
- Vehicle inspections
- Fuel logs

## Key Features
- User authentication with role-based access (admin, manager, driver, technician)
- Vehicle management and tracking
- Job assignment and scheduling with driver/vehicle assignment dropdowns
- Trip monitoring with GPS route points
- Vehicle inspection workflows with 4-angle photo capture (front, back, left, right), GPS verification, odometer, and fuel level logging
- Analytics dashboard
- Waze navigation integration for drivers to navigate to job pickup/delivery locations
- Driver-specific job status updates (in_progress/completed) with ownership validation

## Recent Changes (Dec 2025)
- Fixed job assignment Select dropdowns to properly handle null values with "Unassigned" option
- Added Waze deep link navigation for pickup and delivery locations
- Implemented driver-specific job update endpoint (/api/jobs/:id/driver-update) with role-based authorization
- Added trip event creation with driver ownership verification
- Vehicle inspection already supports 4-photo capture, GPS, odometer, and fuel logging
