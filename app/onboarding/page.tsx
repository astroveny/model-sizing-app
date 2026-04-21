import Link from "next/link";
import { Search, Wrench, FileText, Download } from "lucide-react";
import { OnboardingSection } from "@/components/onboarding/OnboardingSection";

const SECTIONS = [
  {
    step: 1,
    icon: Search,
    title: "Discovery",
    paragraphs: [
      "Start by describing your workload: which model you're running, how many concurrent users you expect, your latency targets (TTFT and ITL), and your infrastructure preferences — GPU vendor, cooling, networking, and orchestration stack.",
      "Discovery feeds the sizing engine. The more accurately you fill it in, the more precise the hardware recommendations. Every field has an ExplainBox that explains what it means and how it affects the output.",
    ] as [string, string],
  },
  {
    step: 2,
    icon: FileText,
    title: "RFI / RFP",
    paragraphs: [
      "If you're responding to a customer RFP or RFI, paste or upload the document here. The tool uses Claude to extract structured requirements — model specs, throughput targets, compliance constraints — and maps them back to Discovery fields.",
      "Once extracted, you can apply requirements to Discovery in one click, then generate a qualification score and a draft response covering all four stack layers.",
    ] as [string, string],
  },
  {
    step: 3,
    icon: Wrench,
    title: "Build",
    paragraphs: [
      "The Build section shows the auto-computed sizing: GPU model and count, server count, rack units, power draw, estimated capex and opex. It reacts instantly whenever you change a Discovery field.",
      "You can override any derived value — the original recommendation is preserved and an override badge is shown. If you left vendor preference open, a side-by-side NVIDIA vs AMD comparison is also available.",
    ] as [string, string],
  },
  {
    step: 4,
    icon: Download,
    title: "Export",
    paragraphs: [
      "When you're ready to share the sizing, export it as a customer-facing PDF proposal, an editable Word document, or a structured JSON Bill of Materials for downstream tooling.",
      "The Export page also offers an internal Build Report (PDF or Markdown) suited for team reviews and pull request attachments — distinct from the customer deliverable.",
    ] as [string, string],
  },
] as const;

export default function OnboardingPage() {
  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-3">
          How this tool works
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          ML Sizer is a local-first tool for sizing and architecting ML/GenAI inference deployments
          across four stack layers: Hardware, Infra Platform, Model Platform, and Application.
          Work through the four phases below in order — each one builds on the last.
        </p>
      </div>

      {/* Phase sections */}
      <div>
        {SECTIONS.map((s) => (
          <OnboardingSection key={s.step} {...s} />
        ))}
      </div>

      {/* CTA */}
      <div className="border-t border-[var(--border-default)] pt-8 flex flex-col items-start gap-3">
        <p className="text-[var(--text-secondary)] text-sm">
          Ready to size your first deployment?
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white transition-colors"
        >
          Go to Projects
        </Link>
      </div>
    </div>
  );
}
