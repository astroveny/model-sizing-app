import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 text-center">
      <Settings className="h-12 w-12 text-[var(--text-secondary)] mx-auto mb-4" />
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Settings</h1>
      <p className="text-[var(--text-secondary)]">Settings coming in next release.</p>
    </div>
  );
}
