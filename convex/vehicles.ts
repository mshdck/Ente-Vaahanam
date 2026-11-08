import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("vehicles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const vehicle = await ctx.db.get(args.id);
    if (!vehicle || vehicle.userId !== userId) return null;
    return vehicle;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    plateNumber: v.optional(v.string()),
    odometer: v.number(),
    distanceUnit: v.union(v.literal("km"), v.literal("mi")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    return await ctx.db.insert("vehicles", {
      userId,
      name: args.name,
      make: args.make,
      model: args.model,
      year: args.year,
      plateNumber: args.plateNumber,
      odometer: args.odometer,
      distanceUnit: args.distanceUnit,
      createdAt: Date.now(),
    });
  },
});

export const updateOdometer = mutation({
  args: {
    id: v.id("vehicles"),
    odometer: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const vehicle = await ctx.db.get(args.id);
    if (!vehicle || vehicle.userId !== userId) {
      throw new Error("Vehicle not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      odometer: args.odometer,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const vehicle = await ctx.db.get(args.id);
    if (!vehicle || vehicle.userId !== userId) {
      throw new Error("Vehicle not found or unauthorized");
    }

    // Cascade delete associated service records
    const records = await ctx.db
      .query("serviceRecords")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.id))
      .collect();

    for (const record of records) {
      await ctx.db.delete(record._id);
    }

    await ctx.db.delete(args.id);
  },
});
