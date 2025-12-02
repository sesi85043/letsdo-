# FleetPro - Fleet Management System

## Overview
FleetPro is a comprehensive fleet management system designed to help manage vehicles, drivers, trips, jobs, and vehicle inspections. The application provides real-time tracking, analytics, photo management, and compliance monitoring.

## Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL (Drizzle ORM)
- **UI Components**: Radix UI + Tailwind CSS
- **Maps**: Leaflet for GPS tracking and route visualization
- **Authentication**: Passport.js with local strategy
- **Real-time**: WebSockets (ws)

## Project Structure
```
.
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Application pages
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and libraries
│   └── index.html
├── server/              # Backend Express application
│   ├── index.ts         # Main server entry point
│   ├── routes.ts        # API routes
│   ├── auth.ts          # Authentication logic
│   ├── db.ts            # Database connection
│   └── vite.ts          # Vite dev server setup
├── shared/              # Shared code between client and server
│   └── schema.ts        # Database schema (Drizzle)
└── script/
    └── build.ts         # Production build script
```

## Database Schema
The application uses the following main tables:
- **users**: User accounts with roles (admin, manager, driver, technician)
- **drivers**: Driver information linked to users
- **vehicles**: Vehicle registry with status tracking
- **jobs**: Job/delivery assignments
- **trips**: Trip records with status tracking
- **trip_events**: Event log for trips (departure, arrival, delays, etc.)
- **vehicle_inspections**: Vehicle inspection records
- **fuel_logs**: Fuel consumption tracking
- **gps_route_points**: GPS tracking data for trips

## Development Setup

### Environment Variables
The application requires the following environment variables:
- `DATABASE_URL`: PostgreSQL connection string (already configured)
- `SESSION_SECRET`: Secret for session management (already configured)
- `PORT`: Server port (defaults to 5000)

### Running Locally
1. Dependencies are already installed
2. Database migrations have been applied
3. Start the development server: The workflow "Start application" is configured and running
4. Access the application at the provided Replit URL

### Database Management
- **Push schema changes**: `npm run db:push`
- **Check TypeScript**: `npm run check`

## Deployment
The application is configured for deployment on Replit:
- **Build command**: `npm run build`
- **Start command**: `npm start`
- **Deployment type**: Autoscale (stateless web application)

The build process:
1. Builds the React frontend with Vite (outputs to `dist/public`)
2. Bundles the Express server with esbuild (outputs to `dist/index.cjs`)
3. Production server serves both API and static files

## Features
- User authentication and authorization
- Vehicle management and tracking
- Driver management
- Job/delivery assignment and tracking
- Trip management with real-time status updates
- GPS route tracking and visualization
- Vehicle inspection workflows
- Photo documentation
- Analytics dashboard
- Fuel consumption tracking
- Route compliance monitoring

## Current State
- All dependencies installed
- PostgreSQL database provisioned and configured
- Database schema migrated successfully
- Development server running on port 5000
- Frontend accessible and functional
- Deployment configuration complete

## Recent Changes (December 2, 2025)
- Imported project from GitHub
- Installed npm dependencies
- Applied database migrations (created all tables)
- Configured development workflow on port 5000
- Set up deployment configuration for production
- Verified application is running successfully
