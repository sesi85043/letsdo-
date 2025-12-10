# FleetPro - Fleet Management System

## Overview
FleetPro is a comprehensive fleet management system built with Express.js backend and React frontend using Vite. It handles vehicle management, driver assignments, trip tracking, job scheduling, and vehicle inspections.

## Project Structure
```
├── client/           # React frontend with Vite
│   ├── src/
│   │   ├── components/   # UI components (Radix UI + shadcn/ui)
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities, auth, theme
│   │   └── pages/        # Route pages
├── server/           # Express.js backend
│   ├── index.ts      # Main server entry point
│   ├── routes.ts     # API routes
│   ├── auth.ts       # Authentication logic
│   ├── db.ts         # Database connection (Drizzle ORM)
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between client/server
│   └── schema.ts     # Drizzle schema definitions
└── script/           # Build scripts
```

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, Radix UI, shadcn/ui components
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **Routing**: wouter (frontend), Express (backend)
- **State Management**: TanStack React Query

## Development
- Run `npm run dev` to start the development server on port 5000
- The server serves both the API and the Vite-powered frontend
- Hot Module Replacement (HMR) is enabled for development

## Database
- PostgreSQL database managed via Drizzle ORM
- Schema defined in `shared/schema.ts`
- Run `npm run db:push` to sync schema changes

## Key Features
- User authentication (admin, manager, driver, technician roles)
- Vehicle fleet management
- Driver management and assignments
- Job scheduling and tracking
- Trip logging with GPS route points
- Vehicle inspections with photo capture
- Fuel logging and efficiency tracking
- Analytics dashboard

## Deployment
- Build: `npm run build`
- Start production: `npm run start`
