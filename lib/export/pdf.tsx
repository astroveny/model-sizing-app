// Ref: PRD §6.4 — PDF export using @react-pdf/renderer

import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type { BomExport } from "./bom-schema";
import type { Project } from "@/lib/store";

const styles = StyleSheet.create({
  page:         { fontFamily: "Helvetica", fontSize: 10, padding: 48, color: "#111" },
  coverPage:    { fontFamily: "Helvetica", padding: 72, justifyContent: "center" },

  // Cover
  coverTitle:   { fontSize: 28, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  coverSub:     { fontSize: 14, color: "#555", marginBottom: 48 },
  coverMeta:    { fontSize: 10, color: "#777", lineHeight: 1.6 },

  // Section
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 24, marginBottom: 8,
                  borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 4 },

  // Table
  table:        { marginTop: 8 },
  tableHeader:  { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 4,
                  paddingHorizontal: 6, marginBottom: 2 },
  tableRow:     { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6,
                  borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  tableCell:    { flex: 1, fontSize: 9 },
  tableCellBold:{ flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },

  // KV rows
  kvRow:        { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#eee" },
  kvLabel:      { width: 160, color: "#555", fontSize: 9 },
  kvValue:      { flex: 1, fontSize: 9 },

  // Footer
  footer:       { position: "absolute", bottom: 32, left: 48, right: 48, flexDirection: "row",
                  justifyContent: "space-between", fontSize: 8, color: "#999" },

  bold:         { fontFamily: "Helvetica-Bold" },
  muted:        { color: "#666" },
  highlight:    { backgroundColor: "#eff6ff", padding: 8, borderRadius: 4, marginTop: 8 },
});

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Footer({ projectName }: { projectName: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{projectName} — Confidential</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

type Props = { project: Project; bom: BomExport };

export function SizingPdfDocument({ project, bom }: Props) {
  const s = bom.sizing;
  const now = new Date(bom.generatedAt).toLocaleDateString("en-US", { dateStyle: "long" });

  return (
    <Document title={`${project.name} — ML Sizing Report`} author="ML Sizer">

      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverTitle}>{project.name}</Text>
        <Text style={styles.coverSub}>ML/GenAI Inference Sizing Report</Text>
        <Text style={styles.coverMeta}>Customer: {project.customer || "—"}</Text>
        <Text style={styles.coverMeta}>Generated: {now}</Text>
        {project.description && (
          <Text style={[styles.coverMeta, { marginTop: 16 }]}>{project.description}</Text>
        )}
      </Page>

      {/* Summary */}
      <Page size="A4" style={styles.page}>
        <Footer projectName={project.name} />
        <SectionTitle>Executive Summary</SectionTitle>
        <Text style={{ fontSize: 9, lineHeight: 1.6 }}>
          This report presents the infrastructure sizing for {project.name || "the proposed deployment"}.
          The sizing engine has determined the recommended hardware configuration based on
          workload requirements, model architecture, and performance targets.
        </Text>

        {s && (
          <>
            <SectionTitle>Sizing Highlights</SectionTitle>
            <View style={styles.highlight}>
              <KvRow label="GPU"               value={`${s.totalGpus}× ${s.gpuModel}`} />
              <KvRow label="Servers"           value={`${s.serverCount}`} />
              <KvRow label="Replicas"          value={`${s.replicas}`} />
              <KvRow label="Power Draw"        value={`${s.powerKw.toFixed(1)} kW`} />
              <KvRow label="Rack Units"        value={`${s.rackUnits}U`} />
              <KvRow label="TTFT (est.)"       value={`${s.ttftMs.toFixed(0)} ms`} />
              <KvRow label="End-to-End P95"    value={`${s.endToEndMs.toFixed(0)} ms`} />
              <KvRow label="Inference Server"  value={s.inferenceServer} />
            </View>
          </>
        )}

        <SectionTitle>Workload Parameters</SectionTitle>
        <KvRow label="Model"             value={project.discovery.model.name || "—"} />
        <KvRow label="Parameters"        value={`${project.discovery.model.params}B`} />
        <KvRow label="Quantization"      value={project.discovery.model.quantization} />
        <KvRow label="Context Length"    value={`${project.discovery.model.contextLength.toLocaleString()} tokens`} />
        <KvRow label="Concurrent Users"  value={`${project.discovery.load.concurrentUsers}`} />
        <KvRow label="Avg Input Tokens"  value={`${project.discovery.load.avgInputTokens}`} />
        <KvRow label="Avg Output Tokens" value={`${project.discovery.load.avgOutputTokens}`} />
        <KvRow label="P95 Target"        value={`${project.discovery.load.targetLatencyP95Ms} ms`} />
      </Page>

      {/* Bill of Materials */}
      <Page size="A4" style={styles.page}>
        <Footer projectName={project.name} />
        <SectionTitle>Bill of Materials</SectionTitle>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellBold, { flex: 2 }]}>Item</Text>
            <Text style={styles.tableCellBold}>Category</Text>
            <Text style={styles.tableCellBold}>Qty</Text>
            <Text style={styles.tableCellBold}>Unit Price</Text>
            <Text style={styles.tableCellBold}>Total</Text>
          </View>
          {bom.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
              <Text style={styles.tableCell}>{item.category}</Text>
              <Text style={styles.tableCell}>{item.quantity}</Text>
              <Text style={styles.tableCell}>
                {item.unitPriceUsd ? `$${item.unitPriceUsd.toLocaleString()}` : "—"}
              </Text>
              <Text style={styles.tableCell}>
                {item.totalPriceUsd ? `$${item.totalPriceUsd.toLocaleString()}` : "—"}
              </Text>
            </View>
          ))}
          <View style={[styles.tableRow, { backgroundColor: "#f9fafb" }]}>
            <Text style={[styles.tableCellBold, { flex: 2 }]}>TOTAL</Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCell}></Text>
            <Text style={styles.tableCellBold}>
              {bom.totals.capexUsd > 0 ? `$${bom.totals.capexUsd.toLocaleString()}` : "—"}
            </Text>
          </View>
        </View>

        <SectionTitle>Assumptions & Disclaimers</SectionTitle>
        <Text style={{ fontSize: 8, color: "#666", lineHeight: 1.6 }}>
          Sizing estimates are based on analytical models and published benchmark data.
          Actual performance may vary based on workload characteristics, software versions,
          and deployment configuration. Pricing reflects list prices and may not include
          discounts, support contracts, or installation costs. This report is intended for
          planning purposes only and should be validated against vendor quotes.
        </Text>
      </Page>

    </Document>
  );
}
