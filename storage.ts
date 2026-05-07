import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  airtableId: text("airtable_id").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull().default("Active"), // Active, Inactive, In shop
});

export const checkoutLogs = sqliteTable("checkout_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  site: text("site").notNull(),
  guardName: text("guard_name").notNull(),
  opsSupportName: text("ops_support_name").notNull(),
  outgoingTime: text("outgoing_time").notNull(),
  returnTime: text("return_time"),
  inspectionComplete: integer("inspection_complete", { mode: "boolean" }).default(false),
  perm24HrPost: integer("perm_24hr_post", { mode: "boolean" }).default(false),
  outOfService: integer("out_of_service", { mode: "boolean" }).default(false),
  outOfServiceDate: text("out_of_service_date"),
});

export const shopLogs = sqliteTable("shop_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vehicleId: integer("vehicle_id").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  shopName: text("shop_name").notNull(),
  dateIn: text("date_in").notNull(),
  timeIn: text("time_in").notNull(),
  notes: text("notes"),
  dateOut: text("date_out"),
  resolved: integer("resolved", { mode: "boolean" }).default(false),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true });
export const insertCheckoutLogSchema = createInsertSchema(checkoutLogs).omit({ id: true });
export const insertShopLogSchema = createInsertSchema(shopLogs).omit({ id: true });

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertCheckoutLog = z.infer<typeof insertCheckoutLogSchema>;
export type CheckoutLog = typeof checkoutLogs.$inferSelect;
export type InsertShopLog = z.infer<typeof insertShopLogSchema>;
export type ShopLog = typeof shopLogs.$inferSelect;
