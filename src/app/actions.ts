"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchAuthMutation } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SERVICE_TYPES, type ServiceType } from "@/lib/types";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const int = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v == null) return null;
  const n = Math.round(Number(v.replace(/,/g, "")));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v == null) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const ymd = (f: FormData, k: string) => {
  const v = str(f, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

export async function addVehicle(formData: FormData) {
  const name = str(formData, "name");
  if (!name) redirect("/vehicles/new?error=name");

  let vehicleId: Id<"vehicles">;
  try {
    vehicleId = await fetchAuthMutation(api.vehicles.create, {
      name,
      make: str(formData, "make") ?? undefined,
      model: str(formData, "model") ?? undefined,
      year: int(formData, "year") ?? undefined,
      plateNumber: str(formData, "plate_number")?.toUpperCase() ?? undefined,
      odometer: int(formData, "odometer") ?? 0,
      distanceUnit: "km",
    });
  } catch {
    redirect("/vehicles/new?error=save");
  }

  revalidatePath("/");
  redirect(`/vehicles/${vehicleId}`);
}

export async function deleteVehicle(vehicleId: string) {
  try {
    await fetchAuthMutation(api.vehicles.remove, {
      id: vehicleId as Id<"vehicles">,
    });
  } catch (err) {
    console.error("deleteVehicle error:", err);
  }
  revalidatePath("/");
  redirect("/");
}

export async function updateOdometer(vehicleId: string, formData: FormData) {
  const odometer = int(formData, "odometer");
  if (odometer != null) {
    await fetchAuthMutation(api.vehicles.updateOdometer, {
      id: vehicleId as Id<"vehicles">,
      odometer,
    });
  }
  revalidatePath(`/vehicles/${vehicleId}`);
}

function recordFields(formData: FormData) {
  const type = str(formData, "type") as ServiceType | null;
  if (!type || !SERVICE_TYPES.includes(type)) return null;
  const done_on = ymd(formData, "done_on");
  if (!done_on) return null;
  const custom_label = str(formData, "custom_label");
  if (type === "other" && !custom_label) return null;

  return {
    type,
    customLabel: type === "other" ? (custom_label ?? undefined) : undefined,
    doneOn: done_on,
    odometer: int(formData, "odometer") ?? undefined,
    cost: num(formData, "cost") ?? undefined,
    notes: str(formData, "notes") ?? undefined,
    remindOn: ymd(formData, "remind_on") ?? undefined,
    remindAtOdometer:
      type === "insurance" ? undefined : (int(formData, "remind_at_odometer") ?? undefined),
  };
}

export async function saveRecord(vehicleId: string, recordId: string | null, formData: FormData) {
  const back = recordId
    ? `/vehicles/${vehicleId}/records/${recordId}/edit`
    : `/vehicles/${vehicleId}/log`;
  const fields = recordFields(formData);
  if (!fields) redirect(`${back}?error=invalid`);

  try {
    await fetchAuthMutation(api.records.save, {
      vehicleId: vehicleId as Id<"vehicles">,
      recordId: recordId ? (recordId as Id<"serviceRecords">) : undefined,
      ...fields,
    });
  } catch {
    redirect(`${back}?error=save`);
  }

  revalidatePath(`/vehicles/${vehicleId}`);
  redirect(`/vehicles/${vehicleId}`);
}

export async function deleteRecord(vehicleId: string, recordId: string) {
  try {
    await fetchAuthMutation(api.records.remove, {
      id: recordId as Id<"serviceRecords">,
    });
  } catch (err) {
    console.error("deleteRecord error:", err);
  }
  revalidatePath(`/vehicles/${vehicleId}`);
  redirect(`/vehicles/${vehicleId}`);
}

/** Close a reminder. "done" offers the follow-up "log the next one" flow in the UI. */
export async function closeReminder(
  vehicleId: string,
  recordId: string,
  state: "done" | "dismissed"
) {
  try {
    await fetchAuthMutation(api.records.closeReminder, {
      id: recordId as Id<"serviceRecords">,
      state,
    });
  } catch (err) {
    console.error("closeReminder error:", err);
  }
  revalidatePath(`/vehicles/${vehicleId}`);
  if (state === "done") redirect(`/vehicles/${vehicleId}?closed=${recordId}`);
}

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  try {
    await fetchAuthMutation(api.subscriptions.save, sub);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function removePushSubscription(endpoint: string) {
  try {
    await fetchAuthMutation(api.subscriptions.remove, { endpoint });
  } catch (err) {
    console.error("removePushSubscription error:", err);
  }
}
