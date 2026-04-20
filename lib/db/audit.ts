import { getDb } from "./client";
import { auditLog } from "./schema";
import { v4 as uuid } from "uuid";

export type AuditEvent =
  | "project.create"
  | "project.save"
  | "project.delete"
  | "llm.call"
  | "export.pdf"
  | "export.docx"
  | "export.bom"
  | "rfi.extract"
  | "rfi.draft";

export function writeAudit(
  event: AuditEvent,
  payload: Record<string, unknown> = {},
  projectId?: string
) {
  try {
    getDb().insert(auditLog)
      .values({
        id: uuid(),
        projectId: projectId ?? null,
        event,
        payloadJson: JSON.stringify(payload),
      })
      .run();
  } catch {
    // audit failures must never crash the main request
  }
}
