import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getActiveRemindersData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db
      .query("serviceRecords")
      .filter((q) => q.eq(q.field("reminderState"), "active"))
      .collect();

    const results = [];
    for (const record of records) {
      if (record.remindOn || record.remindAtOdometer != null) {
        const vehicle = await ctx.db.get(record.vehicleId);
        if (vehicle) {
          const subs = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_user", (q) => q.eq("userId", record.userId))
            .collect();

          results.push({
            record,
            vehicle: {
              _id: vehicle._id,
              name: vehicle.name,
              odometer: vehicle.odometer,
            },
            subs,
          });
        }
      }
    }
    return results;
  },
});

export const updateRecordNotified = internalMutation({
  args: {
    recordId: v.id("serviceRecords"),
    stage: v.union(v.literal("due_soon"), v.literal("overdue")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.recordId, {
      lastNotifiedStage: args.stage,
      lastNotifiedAt: Date.now(),
    });
  },
});

export const deleteDeadSubscription = internalMutation({
  args: {
    subscriptionId: v.id("pushSubscriptions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.subscriptionId);
  },
});
