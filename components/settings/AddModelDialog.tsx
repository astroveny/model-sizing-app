"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AddModelDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddModelDialog({ open, onClose, onAdded }: AddModelDialogProps) {
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState<"anthropic" | "openai-compatible">("anthropic");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setLabel(""); setProvider("anthropic"); setModel("");
    setApiKey(""); setBaseUrl(""); setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !model.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          provider,
          providerConfig: {
            model: model.trim(),
            ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
            ...(provider === "openai-compatible" && baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" })) as { error: string };
        throw new Error(body.error);
      }
      reset();
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add model");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Model</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Opus for heavy analysis" required />
          </div>

          <div className="space-y-1.5">
            <Label>Provider</Label>
            <div className="flex gap-4">
              {(["anthropic", "openai-compatible"] as const).map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" value={p} checked={provider === p} onChange={() => setProvider(p)} />
                  {p === "anthropic" ? "Anthropic" : "OpenAI-compatible"}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Model identifier</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "anthropic" ? "claude-sonnet-4-6" : "llama3.1:8b"}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>API Key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          </div>

          {provider === "openai-compatible" && (
            <div className="space-y-1.5">
              <Label>Base URL</Label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:11434/v1" />
            </div>
          )}

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add Model"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
