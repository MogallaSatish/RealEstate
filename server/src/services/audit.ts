import { AuditLog } from "../models/AuditLog.js";

export async function writeAudit(input: {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: unknown;
  ip?: string;
}) {
  await AuditLog.create({
    actorId: input.actorId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? "",
    metadata: input.metadata,
    ip: input.ip ?? "",
  });
}
