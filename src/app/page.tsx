import Link from "next/link";
import { Plus, ChevronRight, Gauge, Car, AlertCircle, CheckCircle2 } from "lucide-react";
import Shell from "@/components/Shell";
import LicensePlate from "@/components/LicensePlate";
import { fetchAuthQuery } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { reminderStatus, todayIST } from "@/lib/reminders";
import { toVehicle, toServiceRecord, type Vehicle, type ServiceRecord } from "@/lib/types";

export default async function Home() {
  const [vDocs, rDocs] = await Promise.all([
    fetchAuthQuery(api.vehicles.list),
    fetchAuthQuery(api.records.listActiveReminders),
  ]);

  const vehicles: Vehicle[] = (vDocs ?? []).map(toVehicle);
  const reminders: ServiceRecord[] = (rDocs ?? []).map((item: any) => toServiceRecord(item.record));
  const today = todayIST();

  return (
    <Shell>
      {vehicles.length === 0 ? (
        <div className="card text-center py-12 px-6 flex flex-col items-center justify-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950/80 border border-zinc-800 text-teal-400 shadow-inner">
            <Car size={32} strokeWidth={1.8} />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-zinc-100">Your Garage is Empty</h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Add your car or motorcycle to track odometer readings, service records, and automated reminders.
            </p>
          </div>
          <Link href="/vehicles/new" className="btn mt-2 !px-6 !py-2.5">
            <Plus size={16} />
            <span>Add your first vehicle</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Garage Header Banner */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Garage
              </span>
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-300">
                {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
              </span>
            </div>
            <Link
              href="/vehicles/new"
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-300 transition-all hover:bg-teal-500/20 active:scale-95"
            >
              <Plus size={14} />
              <span>Add Vehicle</span>
            </Link>
          </div>

          {/* Vehicle Cards */}
          <ul className="space-y-3">
            {vehicles.map((v: Vehicle) => {
              const vReminders = reminders.filter((r: ServiceRecord) => r.vehicle_id === v.id);
              const statuses = vReminders
                .map((r: ServiceRecord) => reminderStatus(r, v.odometer, today))
                .filter(Boolean);
              const hasOverdue = statuses.includes("overdue");
              const hasDueSoon = statuses.includes("due_soon");

              return (
                <li key={v.id}>
                  <Link
                    href={`/vehicles/${v.id}`}
                    className="card group block border-zinc-800/80 hover:border-zinc-700/90 active:scale-[0.99] transition-all hover:shadow-2xl hover:shadow-teal-950/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-zinc-100 group-hover:text-teal-300 transition-colors truncate">
                            {v.name}
                          </h2>
                          <LicensePlate plate={v.plate_number} />
                        </div>

                        <p className="text-xs text-zinc-400 truncate">
                          {[v.make, v.model, v.year].filter(Boolean).join(" ")}
                        </p>
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-zinc-400 group-hover:text-zinc-200 group-hover:border-zinc-700 shrink-0 transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </div>

                    {/* Bottom stats row */}
                    <div className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-xs">
                      <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                        <Gauge size={14} className="text-teal-400" />
                        <span>
                          {v.odometer.toLocaleString("en-IN")} {v.distance_unit}
                        </span>
                      </div>

                      <div>
                        {hasOverdue ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400">
                            <AlertCircle size={13} className="animate-pulse" />
                            Overdue maintenance
                          </span>
                        ) : hasDueSoon ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                            <AlertCircle size={13} />
                            Service due soon
                          </span>
                        ) : vReminders.length > 0 ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 size={13} />
                            All on track
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500">No active alerts</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Shell>
  );
}
