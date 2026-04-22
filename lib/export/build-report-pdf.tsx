// Ref: PRD §6.4 (revised) — Build Report PDF components (@react-pdf/renderer)
// PDF is always light — no dark-mode tokens here.

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { BuildReport, BuildReportBomRow } from "./build-report-spec";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const C = {
  ink:      "#111111",
  muted:    "#555555",
  faint:    "#888888",
  border:   "#dddddd",
  rowAlt:   "#f9fafb",
  header:   "#f3f4f6",
  accent:   "#1d4ed8",
  warning:  "#92400e",
  warnBg:   "#fffbeb",
};

const styles = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 10, padding: 48, color: C.ink },
  coverPage:    { fontFamily: "Helvetica", padding: 72, justifyContent: "center" },

  // Cover
  coverLabel:   { fontSize: 11, color: C.muted, marginBottom: 6, letterSpacing: 1 },
  coverTitle:   { fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 8, color: C.ink },
  coverSub:     { fontSize: 12, color: C.muted, marginBottom: 40 },
  coverMeta:    { fontSize: 9, color: C.faint, lineHeight: 1.7 },
  coverRule:    { borderBottomWidth: 2, borderBottomColor: C.accent, width: 48, marginBottom: 24 },

  // Section headings
  sectionTitle: {
    fontSize: 12, fontFamily: "Helvetica-Bold",
    marginTop: 20, marginBottom: 6,
    borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 3,
    color: C.ink,
  },
  subTitle:     { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4, color: C.muted },

  // KV rows
  kvRow:        { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.border },
  kvLabel:      { width: 160, color: C.muted, fontSize: 9 },
  kvValue:      { flex: 1, fontSize: 9 },
  kvValueBold:  { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },

  // Tables
  table:        { marginTop: 6 },
  tableHeader:  { flexDirection: "row", backgroundColor: C.header, paddingVertical: 4, paddingHorizontal: 6 },
  tableRow:     { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRowAlt:  { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: C.rowAlt },
  tableCell:    { flex: 1, fontSize: 9 },
  tableCellBold:{ flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },
  tableCellR:   { flex: 1, fontSize: 9, textAlign: "right" },
  tableCellRB:  { flex: 1, fontSize: 9, textAlign: "right", fontFamily: "Helvetica-Bold" },

  // Callout box (summary highlight)
  callout:      { backgroundColor: "#eff6ff", padding: 10, marginTop: 8, marginBottom: 4 },

  // Warning box
  warning:      { backgroundColor: C.warnBg, padding: 8, marginTop: 8, marginBottom: 4 },
  warningText:  { fontSize: 8, color: C.warning, lineHeight: 1.5 },

  // Footer
  footer:       { position: "absolute", bottom: 32, left: 48, right: 48,
                  flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.faint },

  // Misc
  bodyText:     { fontSize: 9, lineHeight: 1.6, color: C.muted, marginTop: 4 },
  bold:         { fontFamily: "Helvetica-Bold" },
  listItem:     { fontSize: 9, lineHeight: 1.6, color: C.muted, marginLeft: 12 },
});

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Footer({ title }: { title: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{title} — Build Report · Confidential</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function SubTitle({ children }: { children: string }) {
  return <Text style={styles.subTitle}>{children}</Text>;
}

function KvRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={bold ? styles.kvValueBold : styles.kvValue}>{value}</Text>
    </View>
  );
}

function fmtUsd(n: number | undefined): string {
  if (n === undefined || n === 0) return "—";
  return `$${n.toLocaleString("en-US")}`;
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function CoverPage({ report }: { report: BuildReport }) {
  const date = new Date(report.generatedAt).toLocaleDateString("en-US", { dateStyle: "long" });
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.coverLabel}>BUILD REPORT</Text>
      <View style={styles.coverRule} />
      <Text style={styles.coverTitle}>{report.project.name}</Text>
      <Text style={styles.coverSub}>ML/GenAI Inference — Internal Sizing Report</Text>
      {report.project.customer && (
        <Text style={styles.coverMeta}>Customer: {report.project.customer}</Text>
      )}
      <Text style={styles.coverMeta}>Deployment: {report.project.deploymentPattern}</Text>
      <Text style={styles.coverMeta}>Generated: {date}</Text>
      {report.project.description && (
        <Text style={[styles.coverMeta, { marginTop: 12 }]}>{report.project.description}</Text>
      )}
      {report.hasOverrides && (
        <Text style={[styles.coverMeta, { marginTop: 12, color: C.warning }]}>
          ⚠ This report includes manually overridden BoM prices.
        </Text>
      )}
    </Page>
  );
}

function SummaryPage({ report }: { report: BuildReport }) {
  const t = report.totals;
  return (
    <Page size="A4" style={styles.page}>
      <Footer title={report.project.name} />
      <SectionTitle>Summary Totals</SectionTitle>
      <View style={styles.callout}>
        <KvRow label="Total GPUs"          value={String(t.totalGpus)} bold />
        <KvRow label="Servers"             value={String(t.serverCount)} />
        <KvRow label="Replicas"            value={String(t.replicas)} />
        <KvRow label="Power Draw"          value={`${t.powerKw.toFixed(1)} kW`} />
        <KvRow label="Rack Units"          value={`${t.rackUnits}U`} />
        <KvRow label="Est. CapEx"          value={fmtUsd(t.capexUsd)} bold />
        <KvRow label="Est. Monthly OpEx"   value={t.opexMonthlyUsd > 0 ? fmtUsd(t.opexMonthlyUsd) : "N/A (on-prem)"} />
      </View>

      <SectionTitle>Hardware</SectionTitle>
      <KvRow label="GPU Model"         value={`${report.hardware.gpuCount}× ${report.hardware.gpuModel}`} />
      <KvRow label="VRAM per GPU"      value={`${report.hardware.vramPerGpuGb} GB`} />
      <KvRow label="Server"            value={`${report.hardware.serverCount}× ${report.hardware.serverModel}`} />
      <KvRow label="GPUs per Server"   value={String(report.hardware.gpusPerServer)} />
      <KvRow label="Intra-node Fabric" value={report.modelPlatform.intraNodeFabric} />
      <KvRow label="Inter-node Fabric" value={report.modelPlatform.interNodeFabric} />
      <KvRow label="Storage"           value={`${report.hardware.storageType.toUpperCase()} · ${report.hardware.storageCapacityTb} TB`} />

      <SectionTitle>Model Platform</SectionTitle>
      <KvRow label="Inference Server"      value={report.modelPlatform.inferenceServer || "—"} />
      <KvRow label="Replicas"              value={String(report.modelPlatform.replicas)} />
      <KvRow label="Tensor Parallelism"    value={String(report.modelPlatform.tensorParallelism)} />
      <KvRow label="Pipeline Parallelism"  value={String(report.modelPlatform.pipelineParallelism)} />
      <KvRow label="KV Cache"              value={`${report.modelPlatform.kvCacheGb} GB`} />
      <KvRow label="TTFT (est.)"           value={`${report.modelPlatform.ttftMs} ms`} />
      <KvRow label="ITL (est.)"            value={`${report.modelPlatform.itlMs} ms`} />
      <KvRow label="End-to-End P95 (est.)" value={`${report.modelPlatform.endToEndMs} ms`} bold />
      <KvRow label="Decode Throughput"     value={`${report.modelPlatform.decodeTokensPerSec.toLocaleString()} tok/s`} />
    </Page>
  );
}

function InfraAppPage({ report }: { report: BuildReport }) {
  const infra = report.infra;
  const app = report.application;
  return (
    <Page size="A4" style={styles.page}>
      <Footer title={report.project.name} />
      <SectionTitle>Infrastructure</SectionTitle>
      <KvRow label="Orchestrator"  value={infra.orchestrator || "—"} />
      <KvRow label="Load Balancer" value={infra.loadBalancer || "—"} />
      <KvRow label="Monitoring"    value={infra.monitoring.length ? infra.monitoring.join(", ") : "—"} />

      {infra.nodePools.length > 0 && (
        <>
          <SubTitle>Node Pools</SubTitle>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellBold, { flex: 2 }]}>Role</Text>
              <Text style={styles.tableCellBold}>Nodes</Text>
            </View>
            {infra.nodePools.map((pool, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{pool.role}</Text>
                <Text style={styles.tableCell}>{pool.nodes}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <SectionTitle>Application Layer</SectionTitle>
      <KvRow label="API Gateway"   value={app.gateway    || "—"} />
      <KvRow label="Auth Method"   value={app.authMethod || "—"} />
      <KvRow label="Rate Limit"    value={app.rateLimitRps > 0 ? `${app.rateLimitRps} RPS` : "—"} />
      <KvRow label="Metering"      value={app.metering ? "Enabled" : "Disabled"} />

      {report.engineNotes.length > 0 && (
        <>
          <SectionTitle>Engine Notes</SectionTitle>
          {report.engineNotes.map((note, i) => (
            <Text key={i} style={styles.listItem}>• {note}</Text>
          ))}
        </>
      )}
    </Page>
  );
}

function BomPage({ report }: { report: BuildReport }) {
  const bom = report.bom;
  const capex = bom.reduce((s, r) => s + (r.totalPriceUsd ?? 0), 0);
  const hasOverrides = bom.some((r) => r.overridden);

  return (
    <Page size="A4" style={styles.page}>
      <Footer title={report.project.name} />
      <SectionTitle>Bill of Materials</SectionTitle>

      <View style={styles.warning}>
        <Text style={styles.warningText}>
          ⚠ Indicative pricing only — confirm all figures with your vendor before committing to a budget.
          {hasOverrides ? " Some prices have been manually adjusted (marked with *)." : ""}
        </Text>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCellBold, { flex: 2 }]}>Item</Text>
          <Text style={styles.tableCellBold}>Category</Text>
          <Text style={styles.tableCellBold}>Qty</Text>
          <Text style={styles.tableCellRB}>Unit Price</Text>
          <Text style={styles.tableCellRB}>Total</Text>
        </View>
        {bom.map((item: BuildReportBomRow, i: number) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.tableCell, { flex: 2 }]}>
              {item.name}{item.overridden ? " *" : ""}
            </Text>
            <Text style={styles.tableCell}>{item.category}</Text>
            <Text style={styles.tableCell}>{item.quantity}</Text>
            <Text style={styles.tableCellR}>{fmtUsd(item.unitPriceUsd)}</Text>
            <Text style={styles.tableCellR}>{fmtUsd(item.totalPriceUsd)}</Text>
          </View>
        ))}
        <View style={[styles.tableRow, { backgroundColor: C.header }]}>
          <Text style={[styles.tableCellBold, { flex: 2 }]}>Total CapEx (Est.)</Text>
          <Text style={styles.tableCell} />
          <Text style={styles.tableCell} />
          <Text style={styles.tableCellRB} />
          <Text style={styles.tableCellRB}>{fmtUsd(capex)}</Text>
        </View>
      </View>
    </Page>
  );
}

function AssumptionsPage({ report }: { report: BuildReport }) {
  return (
    <Page size="A4" style={styles.page}>
      <Footer title={report.project.name} />
      <SectionTitle>Sizing Assumptions</SectionTitle>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCellBold, { flex: 2 }]}>Parameter</Text>
          <Text style={styles.tableCellBold}>Value</Text>
          <Text style={styles.tableCellBold}>Source</Text>
        </View>
        {report.assumptions.map((a, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.tableCell, { flex: 2 }]}>{a.label}</Text>
            <Text style={styles.tableCell}>{String(a.value)}</Text>
            <Text style={[styles.tableCell, { color: a.source === "override" ? C.warning : C.muted }]}>
              {a.source}
            </Text>
          </View>
        ))}
      </View>

      <SectionTitle>Disclaimers</SectionTitle>
      <Text style={styles.bodyText}>
        Sizing estimates are based on analytical models and published benchmark data.
        Actual performance may vary based on workload characteristics, software versions,
        and deployment configuration. Pricing reflects vendor list prices or estimates and
        may not include discounts, support contracts, or installation costs.
        This report is intended for internal planning purposes and should be validated
        against vendor quotes before budget commitment.
      </Text>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Root document export
// ---------------------------------------------------------------------------

export function BuildReportPdfDocument({ report }: { report: BuildReport }) {
  return (
    <Document
      title={`${report.project.name} — Build Report`}
      author="ML Sizer"
      subject="Internal ML/GenAI Infrastructure Build Report"
    >
      <CoverPage    report={report} />
      <SummaryPage  report={report} />
      <InfraAppPage report={report} />
      <BomPage      report={report} />
      <AssumptionsPage report={report} />
    </Document>
  );
}
