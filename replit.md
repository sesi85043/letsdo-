# Fleet Management System

## Overview

A comprehensive fleet management system designed for tracking vehicles, managing drivers, logging trips, and analyzing fleet operations. The application supports role-based access for admins, managers, drivers, and technicians, with features including real-time GPS tracking, job assignment, trip event logging (delays, fuel stops, incidents, photos), and analytics dashboards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript and Vite
- Single-page application (SPA) using Wouter for client-side routing
- Component library: Radix UI primitives with shadcn/ui components
- Styling: Tailwind CSS with Material Design 3 principles
- State management: TanStack Query (React Query) for server state
- Form handling: React Hook Form with Zod validation

**Design System**:
- Material Design 3 approach optimized for data-dense fleet management interfaces
- Custom theme system with light/dark mode support
- Typography: Inter (primary), JetBrains Mono (monospace for data)
- Responsive design with mobile-first approach for field technicians
- Touch-optimized components for tablet/phone usage

**Key UI Patterns**:
- Sidebar navigation with role-based menu items
- Card-based layouts for dashboard metrics and data display
- Modal dialogs for forms and detailed views
- Data tables for listing vehicles, drivers, jobs, and trips
- Interactive maps using Leaflet.js for GPS route visualization

### Backend Architecture

**Framework**: Express.js with TypeScript
- RESTful API design
- File upload support via Multer (for trip event photos)
- Custom authentication middleware using JWT
- Role-based access control (RBAC) with role middleware

**Authentication & Authorization**:
- JWT-based authentication with 7-day token expiration
- Bcrypt password hashing (10 salt rounds)
- Bearer token authentication via Authorization header
- Session secret stored in environment variable
- Role-based route protection (admin, manager, driver, technician)

**Data Layer**:
- Drizzle ORM for type-safe database operations
- PostgreSQL database (Neon serverless)
- Schema-first approach with Drizzle Kit migrations
- Shared schema definitions between client and server

**File Storage**:
- Local file system storage for trip event photos
- Uploads directory at project root
- File type validation (JPEG, PNG, WebP only)
- 10MB file size limit
- Unique filename generation using timestamps and random suffixes

### Database Schema

**Core Entities**:
1. **Users**: Authentication, profile data, role assignment
2. **Drivers**: Extended user data with license info, vehicle assignment
3. **Vehicles**: Fleet inventory with odometer, service dates, status tracking
4. **Jobs**: Customer job assignments with pickup/delivery locations
5. **Trips**: Trip sheets linking drivers, vehicles, and jobs
6. **Trip Events**: Time-stamped events during trips (delays, fuel stops, incidents, photos)
7. **GPS Route Points**: Location tracking data for route visualization

**Relationships**:
- Users → Drivers (one-to-one via userId)
- Drivers → Vehicles (many-to-one via assignedVehicleId)
- Drivers → Jobs (one-to-many)
- Jobs → Trips (one-to-many)
- Trips → Trip Events (one-to-many)
- Trips → GPS Route Points (one-to-many)

**Enumerations**:
- User roles: admin, manager, driver, technician
- Trip status: not_started, in_progress, delayed, completed, cancelled
- Job status: pending, assigned, in_progress, completed, cancelled
- Event types: departure, arrival, delay, fuel_stop, incident, photo, inspection, other
- Vehicle status: available, in_use, maintenance, retired

### API Structure

**Authentication Endpoints**:
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login (returns JWT token)

**Resource Endpoints** (authenticated):
- `/api/vehicles` - Fleet vehicle management
- `/api/drivers` - Driver management
- `/api/jobs` - Job assignment and tracking
- `/api/trips` - Trip logging and status updates
- `/api/trips/:id/events` - Trip event logging
- `/api/trips/:id/gps` - GPS route point tracking
- `/api/analytics` - Dashboard analytics data

**File Upload**:
- Multipart form data for photo uploads
- Photos associated with trip events
- Stored in `/uploads` directory

## External Dependencies

### Core Dependencies

**Frontend**:
- React 18+ with TypeScript
- Vite (build tool and dev server)
- Wouter (client-side routing)
- TanStack Query (server state management)
- Radix UI (headless component primitives)
- Tailwind CSS (utility-first styling)
- Leaflet.js (map visualization)
- Recharts (analytics charts)
- React Hook Form + Zod (form validation)
- date-fns (date formatting)

**Backend**:
- Express.js (web framework)
- Drizzle ORM (database toolkit)
- @neondatabase/serverless (PostgreSQL client)
- bcrypt (password hashing)
- jsonwebtoken (JWT authentication)
- Multer (file uploads)
- Zod (schema validation)

**Development**:
- TypeScript (type safety)
- tsx (TypeScript execution)
- esbuild (server bundling)
- ESLint + Prettier (code quality)

### Third-Party Services

**Database**: Neon Serverless PostgreSQL
- Connection via DATABASE_URL environment variable
- WebSocket support for serverless connections
- Migration management via Drizzle Kit

**Map Tiles**: OpenStreetMap
- Free tile server for map backgrounds
- No API key required
- Attribution required in UI

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `SESSION_SECRET` - JWT signing secret (defaults to 'fleet-management-secret-key')

Optional:
- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port (production)