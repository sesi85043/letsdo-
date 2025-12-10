import * as schema from '@shared/schema';

const dbUrl = process.env.DATABASE_URL;

// Detect SQLite vs Postgres based on URL
const isSqliteUrl = dbUrl && (dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:'));
const isPgUrl = dbUrl && dbUrl.startsWith('postgres://');

let pool: any = null;
let db: any = null;

async function initializeSqliteSchema(sqliteDb: any) {
  // Create tables manually for SQLite since the schema is Postgres-specific
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'driver',
      phone TEXT,
      avatar_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      registration_number TEXT NOT NULL UNIQUE,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      color TEXT,
      vin TEXT,
      current_odometer INTEGER NOT NULL DEFAULT 0,
      fuel_type TEXT NOT NULL DEFAULT 'petrol',
      fuel_capacity REAL,
      status TEXT NOT NULL DEFAULT 'available',
      image_url TEXT,
      last_service_date DATETIME,
      next_service_due DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      user_id TEXT NOT NULL,
      license_number TEXT NOT NULL,
      license_expiry DATETIME NOT NULL,
      assigned_vehicle_id TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      total_trips INTEGER NOT NULL DEFAULT 0,
      total_distance REAL NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      title TEXT NOT NULL,
      description TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      pickup_address TEXT NOT NULL,
      pickup_lat REAL,
      pickup_lng REAL,
      delivery_address TEXT NOT NULL,
      delivery_lat REAL,
      delivery_lng REAL,
      scheduled_date DATETIME NOT NULL,
      estimated_duration INTEGER,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'pending',
      assigned_driver_id TEXT,
      assigned_vehicle_id TEXT,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id),
      FOREIGN KEY (assigned_vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      job_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      vehicle_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      start_time DATETIME,
      end_time DATETIME,
      start_odometer INTEGER,
      end_odometer INTEGER,
      distance_travelled REAL,
      fuel_efficiency REAL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS trip_events (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      trip_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      description TEXT,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    );

    CREATE TABLE IF NOT EXISTS gps_route_points (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      trip_id TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_inspections (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      vehicle_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      inspection_date DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    );

    CREATE TABLE IF NOT EXISTS fuel_logs (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      trip_id TEXT NOT NULL,
      log_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL,
      total_cost REAL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    );
  `;

  try {
    // Split by semicolon and execute each statement
    const statements = createTablesSQL.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      sqliteDb.exec(stmt);
    }
    console.log('[DB] SQLite schema created successfully');
  } catch (err) {
    console.error('[DB] Error creating SQLite schema:', err);
    throw err;
  }
}

async function initializeDb() {
  if (isSqliteUrl) {
    // Use better-sqlite3 for SQLite (file-based or in-memory)
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const { drizzle: drizzleSqlite } = await import('drizzle-orm/better-sqlite3');

    // Extract the file path from the URL (e.g., 'file:./dev.db' -> './dev.db')
    const filePath = dbUrl!.replace(/^file:/, '');
    console.log(`[DB] Using SQLite database at: ${filePath}`);
    
    const sqliteDb = new BetterSqlite3(filePath);
    
    // Create schema if tables don't exist
    await initializeSqliteSchema(sqliteDb);
    
    db = drizzleSqlite(sqliteDb, { schema });
  } else if (isPgUrl) {
    // Use Postgres for valid postgres:// URLs
    const { Pool } = await import('pg');
    const { drizzle: drizzlePostgres } = await import('drizzle-orm/node-postgres');

    console.log('[DB] Using PostgreSQL database');
    pool = new Pool({ connectionString: dbUrl });
    db = drizzlePostgres(pool, { schema });
  } else {
    // Fallback to in-memory SQLite if no valid URL
    console.log('[DB] DATABASE_URL not configured. Using SQLite in-memory for development.');
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const { drizzle: drizzleSqlite } = await import('drizzle-orm/better-sqlite3');

    const sqliteDb = new BetterSqlite3(':memory:');
    await initializeSqliteSchema(sqliteDb);
    db = drizzleSqlite(sqliteDb, { schema });
  }
}

// Initialize the database immediately
await initializeDb();

export { pool, db };
