import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const serviceTypeValidator = v.union(
  v.literal("oil_change"),
  v.literal("insurance"),
  v.literal("tires"),
  v.literal("brakes"),
  v.literal("battery"),
  v.literal("part_replacement"),
  v.literal("repair"),
  v.literal("other")
);

export const listByVehicle = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.userId !== userId) return [];

    const records = await ctx.db
      .query("serviceRecords")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .collect();

    // Sort descending by doneOn, then createdAt
    return records.sort((a, b) => b.doneOn.localeCompare(a.doneOn) || b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("serviceRecords") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) return null;
    return record;
  },
});

export const save = mutation({
  args: {
    recordId: v.optional(v.id("serviceRecords")),
    vehicleId: v.id("vehicles"),
    type: serviceTypeValidator,
    customLabel: v.optional(v.string()),
    doneOn: v.string(),
    odometer: v.optional(v.number()),
    cost: v.optional(v.number()),
    notes: v.optional(v.string()),
    remindOn: v.optional(v.string()),
    remindAtOdometer: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.userId !== userId) {
      throw new Error("Vehicle not found or unauthorized");
    }

    let resultId = args.recordId;

    if (args.recordId) {
      const existing = await ctx.db.get(args.recordId);
      if (!existing || existing.userId !== userId) {
        throw new Error("Record not found or unauthorized");
      }

      await ctx.db.patch(args.recordId, {
        type: args.type,
        customLabel: args.customLabel,
        doneOn: args.doneOn,
        odometer: args.odometer,
        cost: args.cost,
        notes: args.notes,
        remindOn: args.remindOn,
        remindAtOdometer: args.remindAtOdometer,
        reminderState: "active",
        reminderClosedAt: undefined,
        lastNotifiedStage: undefined,
        lastNotifiedAt: undefined,
      });
    } else {
      resultId = await ctx.db.insert("serviceRecords", {
        userId,
        vehicleId: args.vehicleId,
        type: args.type,
        customLabel: args.customLabel,
        doneOn: args.doneOn,
        odometer: args.odometer,
        cost: args.cost,
        notes: args.notes,
        remindOn: args.remindOn,
        remindAtOdometer: args.remindAtOdometer,
        reminderState: "active",
        createdAt: Date.now(),
      });
    }

    // Advance vehicle odometer if this service record has a higher reading
    if (args.odometer != null && args.odometer > vehicle.odometer) {
      await ctx.db.patch(vehicle._id, { odometer: args.odometer });
    }

    return resultId;
  },
});

export const remove = mutation({
  args: { id: v.id("serviceRecords") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found or unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});

export const closeReminder = mutation({
  args: {
    id: v.id("serviceRecords"),
    state: v.union(v.literal("done"), v.literal("dismissed")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      reminderState: args.state,
      reminderClosedAt: Date.now(),
    });
  },
});

export const listActiveReminders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const records = await ctx.db
      .query("serviceRecords")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("reminderState"), "active"))
      .collect();

    const withVehicle = [];
    for (const record of records) {
      if (record.remindOn || record.remindAtOdometer != null) {
        const vehicle = await ctx.db.get(record.vehicleId);
        if (vehicle) {
          withVehicle.push({ record, vehicle });
        }
      }
    }

    return withVehicle;
  },
});
