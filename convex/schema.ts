import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  vehicles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    plateNumber: v.optional(v.string()),
    odometer: v.number(),
    distanceUnit: v.union(v.literal("km"), v.literal("mi")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  serviceRecords: defineTable({
    userId: v.id("users"),
    vehicleId: v.id("vehicles"),
    type: v.union(
      v.literal("oil_change"),
      v.literal("insurance"),
      v.literal("tires"),
      v.literal("brakes"),
      v.literal("battery"),
      v.literal("part_replacement"),
      v.literal("repair"),
      v.literal("other")
    ),
    customLabel: v.optional(v.string()),
    doneOn: v.string(), // YYYY-MM-DD
    odometer: v.optional(v.number()),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),

    // Reminder
    remindOn: v.optional(v.string()),
    remindAtOdometer: v.optional(v.number()),
    reminderState: v.union(
      v.literal("active"),
      v.literal("done"),
      v.literal("dismissed")
    ),
    reminderClosedAt: v.optional(v.number()),

    // Push notification bookkeeping
    lastNotifiedStage: v.optional(
      v.union(v.literal("due_soon"), v.literal("overdue"))
    ),
    lastNotifiedAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_vehicle", ["vehicleId"])
    .index("by_vehicle_and_date", ["vehicleId", "doneOn"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
