import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Shell from "@/components/Shell";
import ServiceForm from "@/components/ServiceForm";
import { saveRecord } from "@/app/actions";
import { fetchAuthQuery } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { addMonths, todayIST } from "@/lib/reminders";
import { SERVICE_TYPES, toVehicle, toServiceRecord, type ServiceRecord, type ServiceType } from "@/lib/types";

/** Work out "every N months / N km" from a previous entry's own reminder. */
function intervalOf(r: ServiceRecord) {
  let months = "",
    km = "";
  if (r.remind_on) {
    for (let m = 1; m <= 60; m++)
      if (addMonths(r.done_on, m) === r.remind_on) {
        months = String(m);
        break;
      }
  }
  if (r.remind_at_odometer != null && r.odometer != null) km = String(r.remind_at_odometer - r.odometer);
  return { months, km };
}

export default async function LogService({ params, searchParams }: PageProps<"/vehicles/[id]/log">) {
  const { id } = await params;
  const { from, type: typeParam, error } = await searchParams;
  let vehicleDoc = null;
  try {
    vehicleDoc = await fetchAuthQuery(api.vehicles.get, { id: id as Id<"vehicles"> });
  } catch {
    notFound();
  }
  if (!vehicleDoc) notFound();
  const vehicle = toVehicle(vehicleDoc);

  let prev: ServiceRecord | null = null;
  if (typeof from === "string") {
    try {
      const prevDoc = await fetchAuthQuery(api.records.get, { id: from as Id<"serviceRecords"> });
      if (prevDoc && prevDoc.vehicleId === (id as Id<"vehicles">)) {
        prev = toServiceRecord(prevDoc);
      }
    } catch {
      prev = null;
    }
  }
  const type = (prev?.type ?? (SERVICE_TYPES.includes(typeParam as ServiceType) ? typeParam : "oil_change")) as ServiceType;
  const iv = prev && type === "oil_change" ? intervalOf(prev) : { months: "", km: "" };
  const today = todayIST();
  const odo = String(vehicle.odometer);

  // Prefilled follow-up for oil changes: same interval, counted from today's date / the vehicle's odometer.
  const remind_on = iv.months ? addMonths(today, Number(iv.months)) : "";
  const remind_at = iv.km ? String(vehicle.odometer + Number(iv.km)) : "";

  return (
    <Shell back={`/vehicles/${id}`} title={prev ? "Schedule Next Service" : "Log Service"}>
      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300">
          <AlertTriangle size={15} className="text-rose-400 shrink-0" />
          <span>Couldn’t save service entry. Check the required fields and try again.</span>
        </div>
      )}

      <ServiceForm
        action={saveRecord.bind(null, id, null)}
        unit={vehicle.distance_unit}
        submitLabel={prev ? "Save & Arm Next Reminder" : "Save Service Entry"}
        initial={{
          type,
          custom_label: prev?.custom_label ?? "",
          done_on: today,
          odometer: odo,
          cost: "",
          notes: "",
          remind_on,
          remind_at_odometer: remind_at,
          intervalMonths: iv.months,
          intervalKm: iv.km,
        }}
      />
    </Shell>
  );
}
