// Ref: PRD §6.4 (revised) — Build Report Markdown renderer (GitHub-flavored)

import type { BuildReport, BuildReportBomRow } from "./build-report-spec";

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fmtUsd(n: number | undefined): string {
  if (n === undefined || n === 0) return "—";
  return `$${n.toLocaleString("en-US")}`;
}

function fmtNum(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toLocaleString("en-US");
}

function tableRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function tableSep(count: number): string {
  return `| ${Array(count).fill("---").join(" | ")} |`;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderFrontmatter(r: BuildReport): string {
  const date = r.generatedAt.slice(0, 10);
  return [
    "---",
    `title: "${r.project.name} — Build Report"`,
    `project: "${r.project.name}"`,
    r.project.customer ? `customer: "${r.project.customer}"` : null,
    `date: ${date}`,
    `generated_by: ml-sizer`,
    `report_version: "${r.version}"`,
    "---",
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function renderToc(): string {
  const sections = [
    "Summary",
    "Hardware",
    "Infrastructure",
    "Model Platform",
    "Application",
    "Bill of Materials",
    "Assumptions",
    "Engine Notes",
  ];
  const lines = sections.map((s) => `- [${s}](#${slug(s)})`);
  return ["## Table of Contents", "", ...lines, ""].join("\n");
}

function renderSummary(r: BuildReport): string {
  const t = r.totals;
  const rows = [
    ["Total GPUs",      fmtNum(t.totalGpus)],
    ["Servers",         fmtNum(t.serverCount)],
    ["Replicas",        fmtNum(t.replicas)],
    ["Power draw",      `${t.powerKw.toFixed(1)} kW`],
    ["Rack units",      fmtNum(t.rackUnits)],
    ["Est. CapEx",      fmtUsd(t.capexUsd)],
    ["Est. Monthly OpEx", t.opexMonthlyUsd > 0 ? fmtUsd(t.opexMonthlyUsd) : "N/A (on-prem)"],
    ["Deployment pattern", r.project.deploymentPattern],
    ...(r.hasOverrides ? [["Price overrides", "Yes — some BoM prices have been manually adjusted"]] : []),
  ];

  return [
    "## Summary",
    "",
    tableRow(["Metric", "Value"]),
    tableSep(2),
    ...rows.map(([k, v]) => tableRow([k, v])),
    "",
  ].join("\n");
}

function renderHardware(r: BuildReport): string {
  const hw = r.hardware;
  const rows = [
    ["GPU model",         hw.gpuModel],
    ["GPU count",         fmtNum(hw.gpuCount)],
    ["VRAM per GPU",      `${hw.vramPerGpuGb} GB`],
    ["Server model",      hw.serverModel],
    ["Server count",      fmtNum(hw.serverCount)],
    ["GPUs per server",   fmtNum(hw.gpusPerServer)],
    ["Intra-node fabric", r.modelPlatform.intraNodeFabric],
    ["Inter-node fabric", r.modelPlatform.interNodeFabric],
    ["Storage type",      hw.storageType.toUpperCase()],
    ["Storage capacity",  `${hw.storageCapacityTb} TB`],
  ];

  return [
    "## Hardware",
    "",
    tableRow(["Component", "Value"]),
    tableSep(2),
    ...rows.map(([k, v]) => tableRow([k, v])),
    "",
  ].join("\n");
}

function renderInfra(r: BuildReport): string {
  const infra = r.infra;
  // TODO: restore when node pool rendering is fixed
  return [
    "## Infrastructure",
    "",
    tableRow(["Component", "Value"]),
    tableSep(2),
    tableRow(["Orchestrator",  infra.orchestrator || "—"]),
    tableRow(["Load balancer", infra.loadBalancer  || "—"]),
    tableRow(["Air-gapped",    infra.airGapped ? "Yes" : "No"]),
    tableRow(["GitOps",        infra.gitops || "—"]),
    tableRow(["Monitoring",    infra.monitoring.length ? infra.monitoring.join(", ") : "—"]),
    "",
  ].join("\n");
}

function renderModelPlatform(r: BuildReport): string {
  const mp = r.modelPlatform;
  const rows = [
    ["Inference server",     mp.inferenceServer || "—"],
    ["Replicas",             fmtNum(mp.replicas)],
    ["Tensor parallelism",   fmtNum(mp.tensorParallelism)],
    ["Pipeline parallelism", fmtNum(mp.pipelineParallelism)],
    ["Expert parallelism",   fmtNum(mp.expertParallelism)],
    ["KV cache",             `${mp.kvCacheGb} GB`],
    ["Max batch size",       fmtNum(mp.maxBatchSize)],
    ["TTFT (est.)",          `${mp.ttftMs} ms`],
    ["ITL (est.)",           `${mp.itlMs} ms`],
    ["End-to-end P95 (est.)", `${mp.endToEndMs} ms`],
    ["Decode throughput",    `${fmtNum(mp.decodeTokensPerSec)} tok/s`],
  ];

  return [
    "## Model Platform",
    "",
    tableRow(["Parameter", "Value"]),
    tableSep(2),
    ...rows.map(([k, v]) => tableRow([k, v])),
    "",
  ].join("\n");
}

function renderApplication(r: BuildReport): string {
  const app = r.application;
  const rows = [
    ["API gateway",    app.gateway    || "—"],
    ["Auth method",    app.authMethod || "—"],
    ["Rate limit",     app.rateLimitRps > 0 ? `${app.rateLimitRps} RPS` : "—"],
    ["Metering",       app.metering ? "Enabled" : "Disabled"],
  ];

  return [
    "## Application",
    "",
    tableRow(["Component", "Value"]),
    tableSep(2),
    ...rows.map(([k, v]) => tableRow([k, v])),
    "",
  ].join("\n");
}

function renderBom(bom: BuildReportBomRow[]): string {
  if (bom.length === 0) {
    return ["## Bill of Materials", "", "_No items — complete Discovery to generate BoM._", ""].join("\n");
  }

  const rows = bom.map((item) => {
    const nameCell = item.overridden ? `${item.name} \\*` : item.name;
    return tableRow([
      nameCell,
      item.category,
      fmtNum(item.quantity),
      item.vendor ?? "—",
      fmtUsd(item.unitPriceUsd),
      fmtUsd(item.totalPriceUsd),
    ]);
  });

  const capex = bom.reduce((s, i) => s + (i.totalPriceUsd ?? 0), 0);
  const hasOverrides = bom.some((i) => i.overridden);

  return [
    "## Bill of Materials",
    "",
    "> ⚠ Indicative pricing — confirm all figures with your vendor before committing to a budget.",
    ...(hasOverrides ? ["> \\* Price overridden by user."] : []),
    "",
    tableRow(["Item", "Category", "Qty", "Vendor", "Unit Price", "Total"]),
    tableSep(6),
    ...rows,
    tableRow(["**Total CapEx (Est.)**", "", "", "", "", `**${fmtUsd(capex)}**`]),
    "",
  ].join("\n");
}

function renderAssumptions(r: BuildReport): string {
  const rows = r.assumptions.map((a) =>
    tableRow([String(a.label), String(a.value), a.source])
  );

  return [
    "## Assumptions",
    "",
    tableRow(["Parameter", "Value", "Source"]),
    tableSep(3),
    ...rows,
    "",
  ].join("\n");
}

function renderEngineNotes(r: BuildReport): string {
  if (r.engineNotes.length === 0) {
    return ["## Engine Notes", "", "_No notes generated._", ""].join("\n");
  }

  return [
    "## Engine Notes",
    "",
    ...r.engineNotes.map((n) => `- ${n}`),
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildReportToMarkdown(report: BuildReport): string {
  const date = report.generatedAt.slice(0, 10);

  const sections = [
    renderFrontmatter(report),
    `# ${report.project.name} — Build Report`,
    "",
    `_Generated ${date}${report.project.customer ? ` · ${report.project.customer}` : ""}_`,
    "",
    renderToc(),
    renderSummary(report),
    renderHardware(report),
    renderInfra(report),
    renderModelPlatform(report),
    renderApplication(report),
    renderBom(report.bom),
    renderAssumptions(report),
    renderEngineNotes(report),
  ];

  return sections.join("\n");
}
