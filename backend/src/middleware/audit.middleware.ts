import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

/**
 * Audit logging middleware for sensitive operations.
 * Logs WHO did WHAT from WHERE and WHEN.
 * Persists to both Winston (structured logs) and the audit_logs DB table.
 * 
 * Usage: router.delete('/:id', auditLog('GROUP_DELETE'), controller.deleteGroup)
 */

interface AuditEntry {
  action: string;
  userId?: string;
  userRole?: string;
  ip: string;
  method: string;
  path: string;
  params: Record<string, string>;
  body?: Record<string, any>;
  timestamp: string;
}

/**
 * Sensitive fields to redact from audit logs
 */
const SENSITIVE_FIELDS = [
  'pin', 'password', 'currentPin', 'newPin',
  'accountNumber', 'payoutAccountNumber', 'branchCode', 'payoutBranchCode',
  'token', 'otp', 'idNumber', 'idNumberHash', 'totpToken', 'totpSecret',
];

function redactSensitiveData(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return data;
  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      redacted[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Creates an audit logging middleware for a specific action.
 * @param action - The action being performed (e.g., 'GROUP_DELETE', 'MEMBER_REMOVE', 'PIN_CHANGE')
 */
export function auditLog(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    const entry: AuditEntry = {
      action,
      userId: user?.id || 'anonymous',
      userRole: user?.role || 'unknown',
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      method: req.method,
      path: req.originalUrl,
      params: req.params as Record<string, string>,
      body: req.body ? redactSensitiveData(req.body) : undefined,
      timestamp: new Date().toISOString(),
    };

    logger.info(`[AUDIT] ${action} | User: ${entry.userId} (${entry.userRole}) | IP: ${entry.ip} | Path: ${entry.method} ${entry.path}`, {
      audit: entry,
    });

    // Capture the response to log outcome
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const success = body?.success ?? (res.statusCode < 400);
      const result = success ? 'SUCCESS' : 'FAILED';

      logger.info(`[AUDIT] ${action} RESULT: ${result} | User: ${entry.userId} | Status: ${res.statusCode}`, {
        audit: { ...entry, result, statusCode: res.statusCode },
      });

      // Persist to database (fire-and-forget — don't block the response)
      prisma.auditLog.create({
        data: {
          action,
          userId: entry.userId || null,
          userRole: entry.userRole || null,
          ip: entry.ip,
          method: entry.method,
          path: entry.path,
          params: entry.params as any,
          body: entry.body as any,
          result,
          statusCode: res.statusCode,
        },
      }).catch(err => logger.error('[AUDIT] DB persist error:', err));

      return originalJson(body);
    };

    next();
  };
}

export default auditLog;
