import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// ============================================================
// Airtable configuration (read from environment)
// ============================================================
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appf7SJsAl6DzYcV7";
const AIRTABLE_TOTAL_CARS_TABLE_ID =
  process.env.AIRTABLE_TOTAL_CARS_TABLE_ID || "tbl5N50qREGA00mm1";
const AIRTABLE_POST_LOG_TABLE_ID =
  process.env.AIRTABLE_POST_LOG_TABLE_ID || "tblO05lgOSbZkPWsI";
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || "";
const SYNC_INTERVAL_MINUTES = parseInt(
  process.env.SYNC_INTERVAL_MINUTES || "60",
  10
);

if (!AIRTABLE_TOKEN) {
  console.warn(
    "[startup] AIRTABLE_TOKEN env var is not set. Airtable sync and write-back will fail until it is configured."
  );
}

const AIRTABLE_API = "https://api.airtable.com/v0";

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
}

async function airtableListRecords(tableId: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${tableId}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Airtable list failed (${resp.status}): ${body}`);
    }
    const data = (await resp.json()) as {
      records: AirtableRecord[];
      offset?: string;
    };
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

async function airtableCreateRecord(
  tableId: string,
  fields: Record<string, any>
): Promise<AirtableRecord | null> {
  try {
    const resp = await fetch(
      `${AIRTABLE_API}/${AIRTABLE_BASE_ID}/${tableId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields, typecast: true }),
      }
    );
    if (!resp.ok) {
      const body = await resp.text();
      console.error(`[Airtable] Create failed (${resp.status}): ${body}`);
      return null;
    }
    const data = (await resp.json()) as AirtableRecord;
    console.log(`[Airtable] Record created: ${data.id}`);
    return data;
  } catch (err: any) {
    console.error("[Airtable] Failed to write record:", err.message);
    return null;
  }
}

function writeToPostLog(fields: Record<string, any>): void {
  // Fire-and-forget; do not block the response
  airtableCreateRecord(AIRTABLE_POST_LOG_TABLE_ID, fields).catch((err) =>
    console.error("[Airtable] async write error:", err)
  );
}

// ============================================================
// Status normalization
// ============================================================
function normalizeStatus(raw: unknown): "Active" | "Inactive" | "In shop" {
  const s = String(raw ?? "").trim();
  if (s === "Active") return "Active";
  if (s === "In shop") return "In shop";
  return "Inactive";
}

// ============================================================
// Sync logic
// ============================================================
export async function syncVehiclesFromAirtable(): Promise<{
  total: number;
  active: number;
  inShop: number;
  inactive: number;
}> {
  if (!AIRTABLE_TOKEN) {
    throw new Error("AIRTABLE_TOKEN is not configured");
  }
  const records = await airtableListRecords(AIRTABLE_TOTAL_CARS_TABLE_ID);
  let active = 0;
  let inShop = 0;
  let inactive = 0;
  for (const r of records) {
    const name = String(r.fields.Name ?? "");
    const status = normalizeStatus(r.fields.Active);
    storage.upsertVehicle({ airtableId: r.id, name, status });
    if (status === "Active") active++;
    else if (status === "In shop") inShop++;
    else inactive++;
  }
  console.log(
    `[sync] ${records.length} vehicles synced (Active: ${active}, In shop: ${inShop}, Inactive: ${inactive})`
  );
  return { total: records.length, active, inShop, inactive };
}

// ============================================================
// Express routes
// ============================================================
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initial sync on startup; do not crash if it fails (e.g. token not yet set)
  try {
    await syncVehiclesFromAirtable();
  } catch (err: any) {
    console.error("[startup] initial sync failed:", err.message);
  }

  // Periodic background sync
  if (SYNC_INTERVAL_MINUTES > 0) {
    setInterval(() => {
      syncVehiclesFromAirtable().catch((err) =>
        console.error("[sync] interval failed:", err.message)
      );
    }, SYNC_INTERVAL_MINUTES * 60 * 1000);
    console.log(
      `[startup] Airtable sync scheduled every ${SYNC_INTERVAL_MINUTES} minute(s)`
    );
  }

  // Manual sync trigger (e.g. for cron-from-outside or admin button)
  app.post("/api/sync", async (_req, res) => {
    try {
      const result = await syncVehiclesFromAirtable();
      res.json({ ok: true, ...result });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // Get all vehicles
  app.get("/api/vehicles", (_req, res) => {
    res.json(storage.getAllVehicles());
  });

  // Get available vehicles (active + not checked out)
  app.get("/api/vehicles/available", (_req, res) => {
    res.json(storage.getAvailableVehicles());
  });

  // Get all checkout logs
  app.get("/api/checkouts", (_req, res) => {
    res.json(storage.getAllCheckoutLogs());
  });

  // Get active checkouts (currently in field)
  app.get("/api/checkouts/active", (_req, res) => {
    res.json(storage.getActiveCheckouts());
  });

  // Create a new checkout
  app.post("/api/checkouts", (req, res) => {
    const {
      vehicleId,
      vehicleName,
      site,
      guardName,
      opsSupportName,
      perm24HrPost,
    } = req.body;
    if (!vehicleId || !vehicleName || !site || !guardName || !opsSupportName) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const outgoingTime = new Date().toISOString();
    const log = storage.createCheckoutLog({
      vehicleId,
      vehicleName,
      site,
      guardName,
      opsSupportName,
      outgoingTime,
      perm24HrPost: perm24HrPost || false,
      inspectionComplete: false,
      outOfService: false,
    });

    writeToPostLog({
      "Vehicle Number": vehicleName,
      "Outgoing Time": outgoingTime,
      Site: site,
      "Guard Name": guardName,
      "Ops Support Name": opsSupportName,
      "Perm24 Hr Post": perm24HrPost || false,
    });

    res.json(log);
  });

  // Return a vehicle
  app.post("/api/checkouts/:id/return", (req, res) => {
    const id = parseInt(req.params.id);
    const { inspectionComplete } = req.body;
    const returnTime = new Date().toISOString();
    const log = storage.returnVehicle(id, returnTime, inspectionComplete || false);
    if (!log) {
      return res.status(404).json({ error: "Checkout not found" });
    }

    writeToPostLog({
      "Vehicle Number": log.vehicleName,
      "Return Time": returnTime,
      Site: `RETURNED from ${log.site}`,
      "Guard Name": log.guardName,
      "Ops Support Name": log.opsSupportName,
      "Incoming inspection Complete": inspectionComplete || false,
    });

    res.json(log);
  });

  // Update vehicle status
  app.patch("/api/vehicles/:id/status", (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!["Active", "Inactive", "In shop"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const vehicle = storage.getVehicleById(id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const updated = storage.upsertVehicle({ ...vehicle, status });
    res.json(updated);
  });

  // Send vehicle to shop
  app.post("/api/shop", (req, res) => {
    const { vehicleId, vehicleName, shopName, dateIn, timeIn, notes } = req.body;
    if (!vehicleId || !vehicleName || !shopName || !dateIn || !timeIn) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const vehicle = storage.getVehicleById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    storage.upsertVehicle({ ...vehicle, status: "In shop" });
    const log = storage.createShopLog({
      vehicleId,
      vehicleName,
      shopName,
      dateIn,
      timeIn,
      notes: notes || null,
      resolved: false,
    });

    writeToPostLog({
      "Vehicle Number": vehicleName,
      "Outgoing Time": new Date(`${dateIn}T${timeIn}`).toISOString(),
      Site: `SHOP: ${shopName}${notes ? " - " + notes : ""}`,
      "Guard Name": "N/A",
      "Ops Support Name": "N/A",
      "Out of Service": true,
      "Out of Service Date": dateIn,
    });

    res.json(log);
  });

  // Get active shop logs
  app.get("/api/shop/active", (_req, res) => {
    res.json(storage.getActiveShopLogs());
  });

  // Resolve shop log (vehicle back from shop)
  app.post("/api/shop/:id/resolve", (req, res) => {
    const id = parseInt(req.params.id);
    const log = storage.resolveShopLog(id, new Date().toISOString());
    if (!log) {
      return res.status(404).json({ error: "Shop log not found" });
    }
    const vehicle = storage.getVehicleById(log.vehicleId);
    if (vehicle) {
      storage.upsertVehicle({ ...vehicle, status: "Active" });
    }
    res.json(log);
  });

  // Dashboard summary
  app.get("/api/dashboard", (_req, res) => {
    const allVehicles = storage.getAllVehicles();
    const activeCheckouts = storage.getActiveCheckouts();
    const activeShopLogs = storage.getActiveShopLogs();
    const checkedOutIds = new Set(activeCheckouts.map((c) => c.vehicleId));

    const activeInField = activeCheckouts.map((c) => {
      const vehicle = allVehicles.find((v) => v.id === c.vehicleId);
      return { ...c, vehicleStatus: vehicle?.status };
    });

    const inShop = allVehicles.filter((v) => v.status === "In shop");
    const inShopWithDetails = inShop.map((v) => {
      const shopLog = activeShopLogs.find((s) => s.vehicleId === v.id);
      return {
        ...v,
        shopName: shopLog?.shopName || "Unknown",
        dateIn: shopLog?.dateIn || null,
        timeIn: shopLog?.timeIn || null,
        notes: shopLog?.notes || null,
        shopLogId: shopLog?.id || null,
      };
    });

    const inactive = allVehicles.filter((v) => v.status === "Inactive");
    const readyToGo = allVehicles.filter(
      (v) => v.status === "Active" && !checkedOutIds.has(v.id)
    );

    const totalActive = allVehicles.filter((v) => v.status === "Active").length;
    const totalInactive = inactive.length;
    const totalInShop = inShop.length;

    res.json({
      activeInField,
      inShop: inShopWithDetails,
      inactive,
      readyToGo,
      totalActive,
      totalInactive,
      totalInShop,
      totalInField: activeInField.length,
      totalReadyToGo: readyToGo.length,
      totalVehicles: allVehicles.length,
    });
  });

  return httpServer;
}
