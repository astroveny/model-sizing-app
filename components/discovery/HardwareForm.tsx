"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExplainBox } from "@/components/ExplainBox";
import { useProjectStore } from "@/lib/store";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FieldRow({
  label,
  fieldId,
  activeField,
  onInfo,
  children,
  hint,
}: {
  label: string;
  fieldId: string;
  activeField: string | null;
  onInfo: (id: string) => void;
  children: React.ReactNode;
  hint?: string;
}) {
  const active = activeField === fieldId;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">{label}</Label>
        <button
          type="button"
          onClick={() => onInfo(active ? "" : fieldId)}
          className={`rounded p-0.5 transition-colors ${
            active ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={`Explain ${label}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function HardwareForm() {
  const [activeField, setActiveField] = useState<string | null>(null);

  const hardware = useProjectStore((s) => s.activeProject?.discovery.hardware);
  const constraints = useProjectStore((s) => s.activeProject?.discovery.constraints);
  const updateField = useProjectStore((s) => s.updateField);

  if (!hardware || !constraints) {
    return <p className="text-sm text-muted-foreground p-6">Loading…</p>;
  }

  const upd = (path: string, value: unknown) =>
    updateField(`discovery.${path}`, value);

  const num = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 p-6 items-start">
      <div className="space-y-8 min-w-0">
        {/* Preferences */}
        <Section title="Hardware Preferences">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Preferred Vendor"
              fieldId="discovery.hardware.preferredVendor"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <Select
                value={hardware.preferredVendor}
                onValueChange={(v) =>
                  upd("hardware.preferredVendor", v as "nvidia" | "amd" | "either")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nvidia">NVIDIA</SelectItem>
                  <SelectItem value="amd">AMD</SelectItem>
                  <SelectItem value="either">No preference (compare both)</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              label="Preferred GPU"
              fieldId="discovery.hardware.preferredGpu"
              activeField={activeField}
              onInfo={setActiveField}
              hint="e.g. H100-80GB, MI300X — leave blank to let the engine decide"
            >
              <Input
                value={hardware.preferredGpu ?? ""}
                onChange={(e) =>
                  upd("hardware.preferredGpu", e.target.value || undefined)
                }
                placeholder="Auto"
              />
            </FieldRow>

            <FieldRow
              label="Cooling"
              fieldId="discovery.hardware.cooling"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <Select
                value={hardware.cooling}
                onValueChange={(v) =>
                  upd("hardware.cooling", v as "air" | "liquid" | "either")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="air">Air cooling</SelectItem>
                  <SelectItem value="liquid">Liquid cooling</SelectItem>
                  <SelectItem value="either">No preference</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              label="Networking Fabric"
              fieldId="discovery.hardware.networking"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <Select
                value={hardware.networking}
                onValueChange={(v) =>
                  upd(
                    "hardware.networking",
                    v as "25G" | "100G" | "400G" | "infiniband"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25G">25G Ethernet</SelectItem>
                  <SelectItem value="100G">100G Ethernet / RoCE</SelectItem>
                  <SelectItem value="400G">400G Ethernet / RoCE</SelectItem>
                  <SelectItem value="infiniband">InfiniBand NDR/HDR</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>
        </Section>

        {/* Constraints */}
        <Section title="Constraints (optional)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Power Budget (kW)"
              fieldId="discovery.constraints.powerBudgetKw"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Total available power for GPU servers"
            >
              <Input
                type="number"
                min={0}
                step={10}
                value={constraints.powerBudgetKw ?? ""}
                onChange={(e) => upd("constraints.powerBudgetKw", num(e.target.value))}
                placeholder="Unlimited"
              />
            </FieldRow>

            <FieldRow
              label="Rack Units Available"
              fieldId="discovery.constraints.rackUnitsAvailable"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Total U available across all racks"
            >
              <Input
                type="number"
                min={0}
                step={1}
                value={constraints.rackUnitsAvailable ?? ""}
                onChange={(e) =>
                  upd("constraints.rackUnitsAvailable", num(e.target.value))
                }
                placeholder="Unlimited"
              />
            </FieldRow>

            <FieldRow
              label="CapEx Budget (USD)"
              fieldId="discovery.constraints.budgetCapex"
              activeField={activeField}
              onInfo={setActiveField}
              hint="One-time hardware spend ceiling"
            >
              <Input
                type="number"
                min={0}
                step={10000}
                value={constraints.budgetCapex ?? ""}
                onChange={(e) => upd("constraints.budgetCapex", num(e.target.value))}
                placeholder="Unlimited"
              />
            </FieldRow>

            <FieldRow
              label="Monthly OpEx Budget (USD)"
              fieldId="discovery.constraints.budgetOpexMonthly"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Cloud / colocation monthly spend ceiling"
            >
              <Input
                type="number"
                min={0}
                step={1000}
                value={constraints.budgetOpexMonthly ?? ""}
                onChange={(e) =>
                  upd("constraints.budgetOpexMonthly", num(e.target.value))
                }
                placeholder="Unlimited"
              />
            </FieldRow>
          </div>
        </Section>
      </div>

      {/* Sticky explain panel */}
      <div className="lg:sticky lg:top-6">
        {activeField ? (
          <ExplainBox fieldId={activeField} />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground text-center">
            Click <Info className="inline h-3.5 w-3.5 mx-0.5" /> next to any
            field to see an explanation.
          </div>
        )}
      </div>
    </div>
  );
}
