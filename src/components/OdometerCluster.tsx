"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Gauge, Pencil, Check, X, Loader2 } from "lucide-react";
import { updateOdometer } from "@/app/actions";

interface OdometerClusterProps {
  vehicleId: string;
  odometer: number;
  unit: string;
}

export default function OdometerCluster({
  vehicleId,
  odometer,
  unit,
}: OdometerClusterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(odometer));
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state if odometer prop changes
  useEffect(() => {
    setValue(String(odometer));
  }, [odometer]);

  // Focus and select input text when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newNum = parseInt(value, 10);
    if (isNaN(newNum) || newNum < 0) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("odometer", String(newNum));
      await updateOdometer(vehicleId, formData);
      setIsEditing(false);
    });
  };

  const handleCancel = () => {
    setValue(String(odometer));
    setIsEditing(false);
  };

  return (
    <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Gauge size={13} className="text-teal-400" />
            Digital Cluster Odometer
          </span>
          <div className="mt-1 flex items-baseline gap-2 font-mono">
            <span className="text-2xl sm:text-3xl font-black tracking-widest text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">
              {odometer.toLocaleString("en-IN")}
            </span>
            <span className="text-xs uppercase font-medium text-zinc-500">
              {unit}
            </span>
          </div>
        </div>

        {isEditing ? (
          <form
            onSubmit={handleSubmit}
            className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 sm:mt-0"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                id="odometer"
                name="odometer"
                type="number"
                inputMode="numeric"
                min={0}
                className="input flex-1 sm:!w-36 !py-2 sm:!py-1.5 text-center font-mono text-[16px] sm:text-sm no-spinners [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="New reading"
                required
                disabled={isPending}
              />
              <span className="text-xs uppercase font-medium text-zinc-500 shrink-0">
                {unit}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isPending || value.trim() === ""}
                className="btn flex-1 sm:flex-none !py-2 sm:!py-1.5 !px-3.5 text-xs shrink-0 flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="btn-ghost flex-1 sm:flex-none !py-2 sm:!py-1.5 !px-3.5 text-xs shrink-0 flex items-center justify-center gap-1.5 text-zinc-400 hover:text-zinc-200"
              >
                <X size={13} />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="btn-ghost !py-1.5 !px-3.5 text-xs shrink-0 flex items-center gap-1.5 text-zinc-300 hover:text-white self-start sm:self-center"
          >
            <Pencil size={13} className="text-teal-400" />
            <span>Edit</span>
          </button>
        )}
      </div>
    </div>
  );
}

