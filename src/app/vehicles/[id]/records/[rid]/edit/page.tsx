import { notFound } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import Shell from "@/components/Shell";
import ServiceForm from "@/components/ServiceForm";
import { deleteRecord, saveRecord } from "@/app/actions";
import { fetchAuthQuery } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ConfirmButton from "@/components/ConfirmButton";
import { toVehicle, toServiceRecord } from "@/lib/types";

export default async function EditRecord({ params, searchParams }: PageProps<"/vehicles/[id]/records/[rid]/edit">) {
  const { id, rid } = await params;
  const { error } = await searchParams;
  let vehicleDoc = null;
  let rDoc = null;
  try {
    [vehicleDoc, rDoc] = await Promise.all([
      fetchAuthQuery(api.vehicles.get, { id: id as Id<"vehicles"> }),
      fetchAuthQuery(api.records.get, { id: rid as Id<"serviceRecords"> }),
    ]);
  } catch {
    notFound();
  }
  if (!vehicleDoc || !rDoc || rDoc.vehicleId !== (id as Id<"vehicles">)) notFound();
  const vehicle = toVehicle(vehicleDoc);
  const r = toServiceRecord(rDoc);

  return (
    <Shell back={`/vehicles/${id}`} title="Edit Service Record">
      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300">
          <AlertTriangle size={15} className="text-rose-400 shrink-0" />
          <span>Couldn’t save record. Check the fields and try again.</span>
        </div>
      )}

      <ServiceForm
        action={saveRecord.bind(null, id, rid)}
        unit={vehicle.distance_unit}
        submitLabel="Save Changes"
        initial={{
          type: r.type,
          custom_label: r.custom_label ?? "",
          done_on: r.done_on,
          odometer: r.odometer?.toString() ?? "",
          cost: r.cost?.toString() ?? "",
          notes: r.notes ?? "",
          remind_on: r.remind_on ?? "",
          remind_at_odometer: r.remind_at_odometer?.toString() ?? "",
          intervalMonths: "",
          intervalKm: "",
        }}
      />

      <form action={deleteRecord.bind(null, id, rid)} className="mt-4">
        <ConfirmButton
          confirmMessage="Are you sure you want to delete this service record?"
          className="btn-danger w-full text-xs"
        >
          <Trash2 size={14} />
          <span>Delete Service Entry</span>
        </ConfirmButton>
      </form>
    </Shell>
  );
}
