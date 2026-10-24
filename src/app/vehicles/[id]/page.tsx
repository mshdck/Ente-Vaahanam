import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Plus,
  Check,
  X,
  ChevronRight,
  Trash2,
  Calendar,
  RotateCcw,
} from "lucide-react";
import Shell from "@/components/Shell";
import StatusBadge from "@/components/StatusBadge";
import LicensePlate from "@/components/LicensePlate";
import ServiceTypeIcon from "@/components/ServiceTypeIcon";
import ServiceIntervalProgress from "@/components/ServiceIntervalProgress";
import NotificationsCard from "@/components/NotificationsCard";
import ConfirmButton from "@/components/ConfirmButton";
import OdometerCluster from "@/components/OdometerCluster";
import { closeReminder, deleteVehicle } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import {
  describeDue,
  inr,
  recordTitle,
  reminderStatus,
  todayIST,
  urgency,
} from "@/lib/reminders";
import type { ServiceRecord, Vehicle } from "@/lib/types";

export default async function VehicleDashboard({
  params,
  searchParams,
}: PageProps<"/vehicles/[id]">) {
  const { id } = await params;
  const { closed } = await searchParams;
  const supabase = await createClient();
  const [{ data: vehicle }, { data: recs }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).single<Vehicle>(),
    supabase
      .from("service_records")
      .select("*")
      .eq("vehicle_id", id)
      .order("done_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!vehicle) notFound();
  const records = (recs ?? []) as ServiceRecord[];
  const today = todayIST();
  const unit = vehicle.distance_unit;

  const upcoming = records
    .map((r) => ({ r, status: reminderStatus(r, vehicle.odometer, today) }))
    .filter(
      (x): x is { r: ServiceRecord; status: NonNullable<typeof x.status> } =>
        x.status !== null,
    )
    .sort(
      (a, b) =>
        urgency(a.r, vehicle.odometer, today) -
        urgency(b.r, vehicle.odometer, today),
    );

  const justClosed =
    typeof closed === "string"
      ? records.find((r) => r.id === closed)
      : undefined;

  return (
    <Shell back="/" title={vehicle.name}>
      {/* Vehicle Hero / Cockpit Header */}
      <div className="mb-6 space-y-4">
        <div className="card cockpit-glow relative overflow-hidden border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {vehicle.name}
                </h1>
                <LicensePlate plate={vehicle.plate_number} />
              </div>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                {[vehicle.make, vehicle.model, vehicle.year]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>
          </div>

          {/* Digital Odometer Cluster */}
          <OdometerCluster
            vehicleId={id}
            odometer={vehicle.odometer}
            unit={unit}
          />
        </div>

        {/* Just Closed Follow-up Notification */}
        {justClosed && (
          <div className="card border-teal-500/40 bg-teal-950/20 shadow-[0_0_20px_rgba(20,184,166,0.15)]">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
                <RotateCcw size={16} />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-teal-200">
                  Marked done: <strong>{recordTitle(justClosed)}</strong>
                </p>
                <p className="text-xs text-zinc-400">
                  Keep your maintenance records continuous by setting up the
                  next interval.
                </p>
                <div className="pt-2">
                  <Link
                    href={`/vehicles/${id}/log?from=${justClosed.id}`}
                    className="btn !py-1.5 !px-3 text-xs"
                  >
                    Log the next one now →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Reminders Section */}
      <section className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Active Reminders
            </h2>
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
              {upcoming.length}
            </span>
          </div>
        </div>

        {upcoming.length === 0 ? (
          <div className="card text-center py-6 text-zinc-400 text-xs">
            No active reminders for this vehicle. Add an interval when you log a
            service.
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map(({ r, status }) => (
              <li
                key={r.id}
                className="card border-zinc-800/90 hover:border-zinc-700/80 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ServiceTypeIcon type={r.type} size="md" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm sm:text-base text-zinc-100 truncate">
                        {recordTitle(r)}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {r.type === "insurance" && r.remind_on
                          ? `Valid until ${r.remind_on} · `
                          : ""}
                        {describeDue(r, vehicle.odometer, unit, today)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {/* Service Interval Progress Bar */}
                <ServiceIntervalProgress
                  record={r}
                  currentOdometer={vehicle.odometer}
                  unit={unit}
                  today={today}
                  status={status}
                />

                {/* Action buttons */}
                <div className="mt-3 flex items-center justify-end gap-2 border-t border-zinc-800/60 pt-2.5">
                  <form
                    action={closeReminder.bind(null, id, r.id, "dismissed")}
                  >
                    <button
                      className="btn-ghost !py-1 !px-2.5 text-xs text-zinc-400 hover:text-zinc-200"
                      title="Dismiss reminder"
                    >
                      <X size={13} />
                      <span>Dismiss</span>
                    </button>
                  </form>
                  <form action={closeReminder.bind(null, id, r.id, "done")}>
                    <button
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                      title="Mark as completed"
                    >
                      <Check size={13} />
                      <span>Mark Done</span>
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Push Notifications Configuration */}
      <NotificationsCard />

      {/* Service History Timeline */}
      <section className="mb-8 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Service History
            </h2>
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
              {records.length}
            </span>
          </div>
          <Link
            href={`/vehicles/${id}/log`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-teal-950/40 hover:from-teal-400 hover:to-emerald-500 active:scale-95 transition-all"
          >
            <Plus size={14} />
            <span>Log Service</span>
          </Link>
        </div>

        {records.length === 0 ? (
          <div className="card text-center py-8 text-zinc-400 text-xs">
            <p>No service history recorded yet.</p>
            <Link
              href={`/vehicles/${id}/log`}
              className="btn mt-3 !py-2 !px-4 text-xs font-semibold"
            >
              Add First Record
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {records.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/vehicles/${id}/records/${r.id}/edit`}
                  className="card group flex items-center justify-between gap-3 border-zinc-800/70 hover:border-zinc-700 active:scale-[0.99] transition-all p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ServiceTypeIcon type={r.type} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-100 group-hover:text-teal-300 transition-colors truncate">
                          {recordTitle(r)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-zinc-500" />
                          {r.done_on}
                        </span>
                        {r.odometer != null && (
                          <>
                            <span>·</span>
                            <span className="font-mono">
                              {r.odometer.toLocaleString("en-IN")} {unit}
                            </span>
                          </>
                        )}
                        {r.cost != null && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-emerald-400">
                              {inr(r.cost)}
                            </span>
                          </>
                        )}
                      </div>
                      {r.notes && (
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                          {r.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950/60 border border-zinc-800 text-zinc-500 group-hover:text-zinc-300 shrink-0 transition-colors">
                    <ChevronRight size={14} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Danger Zone: Delete Vehicle */}
      <div className="border-t border-zinc-800/80 pt-6">
        <form action={deleteVehicle.bind(null, id)}>
          <ConfirmButton
            confirmMessage="Are you sure you want to delete this vehicle and all its service history?"
            className="flex items-center gap-1.5 text-xs text-rose-400/80 hover:text-rose-400 underline transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Delete this vehicle and its service history</span>
          </ConfirmButton>
        </form>
      </div>
    </Shell>
  );
}
