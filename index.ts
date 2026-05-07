import {
  type Vehicle, type InsertVehicle, vehicles,
  type CheckoutLog, type InsertCheckoutLog, checkoutLogs,
  type ShopLog, type InsertShopLog, shopLogs,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, isNull, and, isNotNull } from "drizzle-orm";

const DB_PATH = process.env.DB_PATH || "data.db";
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Vehicles
  getAllVehicles(): Vehicle[];
  getVehicleById(id: number): Vehicle | undefined;
  upsertVehicle(vehicle: InsertVehicle): Vehicle;

  // Checkout Logs
  getAllCheckoutLogs(): CheckoutLog[];
  getActiveCheckouts(): CheckoutLog[];
  getCheckoutLogById(id: number): CheckoutLog | undefined;
  createCheckoutLog(log: InsertCheckoutLog): CheckoutLog;
  returnVehicle(id: number, returnTime: string, inspectionComplete: boolean): CheckoutLog | undefined;

  // Shop Logs
  getActiveShopLogs(): ShopLog[];
  createShopLog(log: InsertShopLog): ShopLog;
  resolveShopLog(id: number, dateOut: string): ShopLog | undefined;

  // Dashboard data
  getAvailableVehicles(): Vehicle[];
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        airtable_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active'
      )
    `);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS checkout_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        vehicle_name TEXT NOT NULL,
        site TEXT NOT NULL,
        guard_name TEXT NOT NULL,
        ops_support_name TEXT NOT NULL,
        outgoing_time TEXT NOT NULL,
        return_time TEXT,
        inspection_complete INTEGER DEFAULT 0,
        perm_24hr_post INTEGER DEFAULT 0,
        out_of_service INTEGER DEFAULT 0,
        out_of_service_date TEXT
      )
    `);
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS shop_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        vehicle_name TEXT NOT NULL,
        shop_name TEXT NOT NULL,
        date_in TEXT NOT NULL,
        time_in TEXT NOT NULL,
        notes TEXT,
        date_out TEXT,
        resolved INTEGER DEFAULT 0
      )
    `);

  }

  getAllVehicles(): Vehicle[] {
    return db.select().from(vehicles).all();
  }

  getVehicleById(id: number): Vehicle | undefined {
    return db.select().from(vehicles).where(eq(vehicles.id, id)).get();
  }

  upsertVehicle(vehicle: InsertVehicle): Vehicle {
    const existing = db.select().from(vehicles).where(eq(vehicles.airtableId, vehicle.airtableId)).get();
    if (existing) {
      db.update(vehicles).set({ name: vehicle.name, status: vehicle.status }).where(eq(vehicles.id, existing.id)).run();
      return db.select().from(vehicles).where(eq(vehicles.id, existing.id)).get()!;
    }
    return db.insert(vehicles).values(vehicle).returning().get();
  }

  getAllCheckoutLogs(): CheckoutLog[] {
    return db.select().from(checkoutLogs).all();
  }

  getActiveCheckouts(): CheckoutLog[] {
    return db.select().from(checkoutLogs).where(isNull(checkoutLogs.returnTime)).all();
  }

  getCheckoutLogById(id: number): CheckoutLog | undefined {
    return db.select().from(checkoutLogs).where(eq(checkoutLogs.id, id)).get();
  }

  createCheckoutLog(log: InsertCheckoutLog): CheckoutLog {
    return db.insert(checkoutLogs).values(log).returning().get();
  }

  returnVehicle(id: number, returnTime: string, inspectionComplete: boolean): CheckoutLog | undefined {
    db.update(checkoutLogs)
      .set({ returnTime, inspectionComplete })
      .where(eq(checkoutLogs.id, id))
      .run();
    return db.select().from(checkoutLogs).where(eq(checkoutLogs.id, id)).get();
  }

  // Shop Logs
  getActiveShopLogs(): ShopLog[] {
    return db.select().from(shopLogs).where(eq(shopLogs.resolved, false)).all();
  }

  createShopLog(log: InsertShopLog): ShopLog {
    return db.insert(shopLogs).values(log).returning().get();
  }

  resolveShopLog(id: number, dateOut: string): ShopLog | undefined {
    db.update(shopLogs)
      .set({ dateOut, resolved: true })
      .where(eq(shopLogs.id, id))
      .run();
    return db.select().from(shopLogs).where(eq(shopLogs.id, id)).get();
  }

  getAvailableVehicles(): Vehicle[] {
    // Get all active vehicles
    const activeVehicles = db.select().from(vehicles).where(eq(vehicles.status, "Active")).all();
    // Get currently checked out vehicle IDs (no return time)
    const checkedOut = db.select().from(checkoutLogs).where(isNull(checkoutLogs.returnTime)).all();
    const checkedOutVehicleIds = new Set(checkedOut.map(c => c.vehicleId));
    // Return only active vehicles that are NOT currently checked out
    return activeVehicles.filter(v => !checkedOutVehicleIds.has(v.id));
  }
}

export const storage = new DatabaseStorage();
