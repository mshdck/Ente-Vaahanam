"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";

const WEEK_MS = 7 * 86_400_000;

function calculateStatus(
  remindOn?: string,
  remindAtOdometer?: number,
  currentOdo?: number,
  todayStr?: string
): "due_soon" | "overdue" | null {
  if (!todayStr) return null;

  // Date check
  if (remindOn) {
    const diffDays = Math.ceil(
      (new Date(remindOn).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) return "overdue";
    if (diffDays <= 14) return "due_soon";
  }

  // Mileage check
  if (remindAtOdometer != null && currentOdo != null) {
    const diffKm = remindAtOdometer - currentOdo;
    if (diffKm <= 0) return "overdue";
    if (diffKm <= 500) return "due_soon";
  }

  return null;
}

export const checkAndSendReminders = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ sent?: number; reason?: string; usersNotified?: number; totalActive?: number }> => {
    const vapidSubject = process.env.VAPID_SUBJECT;
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (!vapidSubject || !vapidPublic || !vapidPrivate) {
      console.warn("VAPID keys not configured in Convex environment variables. Skipping push.");
      return { sent: 0, reason: "VAPID keys missing" };
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const items = await ctx.runQuery(internal.notifications.getActiveRemindersData);
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);

    // Group items by user
    const byUser = new Map<string, typeof items>();
    for (const item of items) {
      const status = calculateStatus(
        item.record.remindOn,
        item.record.remindAtOdometer,
        item.vehicle.odometer,
        todayStr
      );
      if (status !== "due_soon" && status !== "overdue") continue;

      const last = item.record.lastNotifiedAt ?? 0;
      const notify =
        item.record.lastNotifiedStage == null ||
        (status === "overdue" && item.record.lastNotifiedStage === "due_soon") ||
        (status === "overdue" && now - last >= WEEK_MS);

      if (!notify) continue;

      const userList = byUser.get(item.record.userId) ?? [];
      userList.push(item);
      byUser.set(item.record.userId, userList);
    }

    let usersNotified = 0;

    for (const [, userItems] of byUser) {
      const subs = userItems[0]?.subs ?? [];
      if (!subs.length) continue;

      const first = userItems[0];
      const overdueCount = userItems.filter(
        (i: (typeof items)[number]) =>
          calculateStatus(i.record.remindOn, i.record.remindAtOdometer, i.vehicle.odometer, todayStr) === "overdue"
      ).length;

      const payload = JSON.stringify({
        title: overdueCount > 0 ? "Vehicle service overdue" : "Vehicle service due soon",
        body:
          userItems.length === 1
            ? `${first.record.type} · ${first.vehicle.name} is due.`
            : `${userItems.length} reminders need attention (${overdueCount} overdue).`,
        url: userItems.length === 1 ? `/vehicles/${first.vehicle._id}` : "/",
      });

      let delivered = false;
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          delivered = true;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await ctx.runMutation(internal.notifications.deleteDeadSubscription, {
              subscriptionId: s._id,
            });
          }
        }
      }

      if (delivered) {
        usersNotified++;
        for (const item of userItems) {
          const stage = calculateStatus(
            item.record.remindOn,
            item.record.remindAtOdometer,
            item.vehicle.odometer,
            todayStr
          );
          if (stage) {
            await ctx.runMutation(internal.notifications.updateRecordNotified, {
              recordId: item.record._id,
              stage,
            });
          }
        }
      }
    }

    return { usersNotified, totalActive: items.length };
  },
});
