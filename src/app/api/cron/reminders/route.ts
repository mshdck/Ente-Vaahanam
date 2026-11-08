import { fetchAction } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

// Optional external trigger for manual testing or external cron pings
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await fetchAction(api.sendPush.checkAndSendReminders);
    return Response.json(result);
  } catch (err: any) {
    return Response.json({ error: err?.message }, { status: 500 });
  }
}
