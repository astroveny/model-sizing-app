"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Zap, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { createProjectAction } from "@/lib/actions/projects";
import { defaultProject } from "@/lib/store";
import { DISCOVERY_DEFAULTS } from "@/lib/discovery/defaults";
import { SKIPPABLE_FIELDS } from "@/lib/discovery/field-meta";
import { recommend, recommendWithLlm } from "@/lib/quick-sizing/recommender";
import type { QuickSizingInput, ModelCandidate, ModelEntry } from "@/lib/quick-sizing/recommender";
import { useCatalog } from "@/lib/catalogs/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LatencySensitivity = QuickSizingInput["latency"];
type DeploymentPattern = QuickSizingInput["deploymentPattern"];
type DeploymentTarget = QuickSizingInput["deploymentTarget"];
type ModelChoice = "known" | "recommend";

interface FormState {
  // Step 1
  objective: string;
  // Step 2
  modelChoice: ModelChoice;
  knownModelId: string;
  knownModelName: string;
  // Step 3
  concurrentUsers: number;
  // Step 4
  latency: LatencySensitivity;
  // Step 5
  deploymentPattern: DeploymentPattern;
  deploymentTarget: DeploymentTarget;
}

const LATENCY_OPTIONS: { value: LatencySensitivity; label: string; hint: string }[] = [
  { value: "realtime", label: "Real-time chat", hint: "< 5s end-to-end" },
  { value: "responsive", label: "Responsive", hint: "< 15s end-to-end" },
  { value: "batch", label: "Batch / offline", hint: "No latency target" },
  { value: "none", label: "No preference", hint: "Let the engine decide" },
];

const PATTERN_OPTIONS: { value: DeploymentPattern; label: string }[] = [
  { value: "internal-inference", label: "Internal inference" },
  { value: "external-api", label: "External API" },
  { value: "gpuaas-multi-tenant", label: "GPU-as-a-Service" },
  { value: "saas-product", label: "SaaS product" },
];

const TARGET_OPTIONS: { value: DeploymentTarget; label: string }[] = [
  { value: "on-prem", label: "On-premises" },
  { value: "cloud", label: "Cloud" },
  { value: "hybrid", label: "Hybrid" },
];

// ---------------------------------------------------------------------------
// Model search
// ---------------------------------------------------------------------------

function searchModels(query: string, models: ModelEntry[]): ModelEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return models.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      (m.family ?? "").toLowerCase().includes(q)
  ).slice(0, 5);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QuickSizingPage() {
  const router = useRouter();
  const catalog = useCatalog();
  const allModels: ModelEntry[] = catalog?.llmModels.map((m) => ({
    id: m.id,
    name: m.name ?? m.id,
    params_b: m.paramsB ?? 0,
    architecture: (m.architecture ?? "dense") as "dense" | "moe",
    family: m.family ?? undefined,
  })) ?? [];
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<ModelCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<ModelCandidate | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [modelSearchResults, setModelSearchResults] = useState<ModelEntry[]>([]);

  const [form, setForm] = useState<FormState>({
    objective: "",
    modelChoice: "recommend",
    knownModelId: "",
    knownModelName: "",
    concurrentUsers: 50,
    latency: "responsive",
    deploymentPattern: "internal-inference",
    deploymentTarget: "on-prem",
  });

  const upd = (key: keyof FormState, val: FormState[keyof FormState]) =>
    setForm((f) => ({ ...f, [key]: val }));

  function handleModelSearch(q: string) {
    setModelSearchQuery(q);
    setModelSearchResults(searchModels(q, allModels));
  }

  function pickKnownModel(m: ModelEntry) {
    upd("knownModelId", m.id);
    upd("knownModelName", m.name);
    setModelSearchQuery(m.name);
    setModelSearchResults([]);
  }

  async function handleSubmit() {
    setBusy(true);

    // Run recommender
    const input: QuickSizingInput = {
      objective: form.objective,
      concurrentUsers: form.concurrentUsers,
      latency: form.latency,
      deploymentPattern: form.deploymentPattern,
      deploymentTarget: form.deploymentTarget,
      knownModelId: form.modelChoice === "known" ? form.knownModelId : undefined,
    };
    const recs = form.modelChoice === "recommend"
      ? await recommendWithLlm(input, allModels)
      : recommend(input, allModels);
    setCandidates(recs);
    if (recs.length === 1) {
      setSelectedCandidate(recs[0]);
    }
    setBusy(false);
    setStep(6); // review step
  }

  async function applyAndNavigate(candidate: ModelCandidate) {
    setBusy(true);
    const id = uuidv4();
    const project = defaultProject(id, form.objective || `Quick Sizing — ${candidate.name}`);
    project._source = "quick-sizing";
    project.deploymentPattern = form.deploymentPattern;
    project.deploymentTarget = form.deploymentTarget;

    // Apply model
    const modelEntry = allModels.find((m) => m.id === candidate.modelId);
    if (modelEntry) {
      project.discovery.model.name = modelEntry.name ?? "";
      project.discovery.model.family = modelEntry.family ?? "";
      project.discovery.model.params = candidate.paramsB;
      project.discovery.model.architecture = candidate.architecture;
    }

    // Apply load basics
    project.discovery.load.concurrentUsers = form.concurrentUsers;

    const latencyMap: Record<LatencySensitivity, { p50: number; p95: number; ttft: number; itl: number }> = {
      realtime:   { p50: 3000,  p95: 5000,  ttft: 300,  itl: 30  },
      responsive: { p50: 8000,  p95: 15000, ttft: 1000, itl: 100 },
      batch:      { p50: 60000, p95: 120000, ttft: 5000, itl: 500 },
      none:       { p50: 5000,  p95: 10000, ttft: 500,  itl: 50  },
    };
    const lat = latencyMap[form.latency];
    project.discovery.load.targetLatencyP50Ms = lat.p50;
    project.discovery.load.targetLatencyP95Ms = lat.p95;
    project.discovery.load.targetTTFTMs = lat.ttft;
    project.discovery.load.targetITLMs = lat.itl;

    // Mark all skippable fields as skipped and apply defaults
    project.discovery._skipped = [...SKIPPABLE_FIELDS];
    for (const fieldId of SKIPPABLE_FIELDS) {
      const defaultVal = DISCOVERY_DEFAULTS[fieldId as keyof typeof DISCOVERY_DEFAULTS];
      if (defaultVal !== undefined) {
        applyNestedDefault(project.discovery as unknown as Record<string, unknown>, fieldId, defaultVal);
      }
    }
    // Un-skip fields we explicitly set above
    project.discovery._skipped = project.discovery._skipped.filter(
      (f) => !["load.targetLatencyP50Ms", "load.targetLatencyP95Ms", "load.targetTTFTMs", "load.targetITLMs"].includes(f)
    );

    await createProjectAction(project);
    router.push(`/project/${id}/discovery`);
  }

  const canProceed = (): boolean => {
    if (step === 1) return form.objective.trim().length > 0;
    if (step === 2) {
      if (form.modelChoice === "known") return !!form.knownModelId;
      return true;
    }
    if (step === 3) return form.concurrentUsers >= 1;
    return true;
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-full bg-[var(--accent-primary)]/10 p-2">
          <Zap className="h-5 w-5 text-[var(--accent-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Quick Sizing</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Answer 5 questions — we fill the rest with sensible defaults.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      {step <= 5 && (
        <div className="flex gap-1 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[var(--accent-primary)]" : "bg-[var(--border-default)]"
              }`}
            />
          ))}
        </div>
      )}

      {/* Step 1 — Objective */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[var(--text-primary)]">
            Step 1 of 5 — What are you trying to do?
          </h2>
          <div className="space-y-1.5">
            <Label htmlFor="objective">Objective</Label>
            <Input
              id="objective"
              value={form.objective}
              onChange={(e) => upd("objective", e.target.value)}
              placeholder="e.g. Internal chatbot for engineering, customer-facing Q&A, code assistant…"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && canProceed() && setStep(2)}
            />
          </div>
        </div>
      )}

      {/* Step 2 — Model */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[var(--text-primary)]">
            Step 2 of 5 — Which model?
          </h2>
          <div className="flex gap-3">
            {(["recommend", "known"] as const).map((choice) => (
              <button
                key={choice}
                onClick={() => upd("modelChoice", choice)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                  form.modelChoice === choice
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 text-[var(--text-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                }`}
              >
                {choice === "recommend" ? "Let the app recommend" : "I know the model"}
              </button>
            ))}
          </div>

          {form.modelChoice === "known" && (
            <div className="space-y-1.5 relative">
              <Label>Search model</Label>
              <Input
                value={modelSearchQuery}
                onChange={(e) => handleModelSearch(e.target.value)}
                placeholder="e.g. Llama 70B, Mistral 7B…"
                autoFocus
              />
              {modelSearchResults.length > 0 && (
                <div className="absolute z-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-lg">
                  {modelSearchResults.map((m) => (
                    <button
                      key={m.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-subtle)] transition-colors"
                      onClick={() => pickKnownModel(m)}
                    >
                      <span className="font-medium text-[var(--text-primary)]">{m.name}</span>
                      <span className="text-[var(--text-secondary)] ml-2">{m.params_b}B</span>
                    </button>
                  ))}
                </div>
              )}
              {form.knownModelId && (
                <p className="text-xs text-[var(--success)]">✓ Selected: {form.knownModelName}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Scale */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-base font-medium text-[var(--text-primary)]">
            Step 3 of 5 — Concurrent users at peak
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Slider
                min={1}
                max={1000}
                step={1}
                value={[form.concurrentUsers]}
                onValueChange={(v) => {
                  const val = Array.isArray(v) ? v[0] : v;
                  if (typeof val === "number") upd("concurrentUsers", val);
                }}
                className="flex-1"
              />
              <Input
                type="number"
                min={1}
                value={form.concurrentUsers}
                onChange={(e) => upd("concurrentUsers", Math.max(1, Number(e.target.value)))}
                className="w-24"
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Simultaneous active requests at peak load.
            </p>
          </div>
        </div>
      )}

      {/* Step 4 — Latency */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[var(--text-primary)]">
            Step 4 of 5 — Latency sensitivity
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {LATENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => upd("latency", opt.value)}
                className={`rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                  form.latency === opt.value
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 text-[var(--text-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                }`}
              >
                <p className="font-medium text-[var(--text-primary)]">{opt.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.hint}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5 — Deployment */}
      {step === 5 && (
        <div className="space-y-6">
          <h2 className="text-base font-medium text-[var(--text-primary)]">
            Step 5 of 5 — Deployment
          </h2>
          <div className="space-y-3">
            <Label>Pattern</Label>
            <div className="grid grid-cols-2 gap-2">
              {PATTERN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => upd("deploymentPattern", opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    form.deploymentPattern === opt.value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 text-[var(--text-primary)]"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>Target</Label>
            <div className="grid grid-cols-3 gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => upd("deploymentTarget", opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    form.deploymentTarget === opt.value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 text-[var(--text-primary)]"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 6 — Pick a candidate */}
      {step === 6 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[var(--text-primary)]">
            {candidates.length === 1 ? "Confirm model" : "Pick a model"}
          </h2>
          {candidates.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">No candidates found — please go back and adjust settings.</p>
          )}
          <div className="space-y-2">
            {candidates.map((c) => (
              <button
                key={c.modelId}
                onClick={() => setSelectedCandidate(c)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                  selectedCandidate?.modelId === c.modelId
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                    : "border-[var(--border-default)] hover:border-[var(--text-secondary)]"
                }`}
              >
                <p className="font-medium text-[var(--text-primary)] text-sm">{c.name}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {c.paramsB}B params · {c.architecture}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{c.rationale}</p>
              </button>
            ))}
          </div>

          <Button
            className="w-full"
            disabled={!selectedCandidate || busy}
            onClick={() => selectedCandidate && applyAndNavigate(selectedCandidate)}
          >
            {busy ? "Creating project…" : "Apply & start sizing →"}
          </Button>

          <button
            onClick={() => setStep(5)}
            className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
          >
            Go back
          </button>
        </div>
      )}

      {/* Navigation */}
      {step <= 5 && (
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || busy}
            >
              {busy ? "Finding models…" : "See recommendations"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: write a default into a nested object by dot-path
// ---------------------------------------------------------------------------
function applyNestedDefault(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") {
      cur[keys[i]] = {};
    }
    cur = cur[keys[i]] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}
