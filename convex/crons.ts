import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Run daily at 02:30 UTC (08:00 IST)
crons.daily(
  "daily-vehicle-service-reminders",
  { hourUTC: 2, minuteUTC: 30 },
  api.sendPush.checkAndSendReminders
);

export default crons;
