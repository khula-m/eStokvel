import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Audit logging middleware for sensitive operations.
 * Logs WHO did WHAT from WHERE and WHEN.
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
const SENSITIVE_FIELDS = ['pin', 'password', 'currentPin', 'newPin', 'accountNumber', 'token'];

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
      logger.info(`[AUDIT] ${action} RESULT: ${success ? 'SUCCESS' : 'FAILED'} | User: ${entry.userId} | Status: ${res.statusCode}`, {
        audit: { ...entry, result: success ? 'SUCCESS' : 'FAILED', statusCode: res.statusCode },
      });
      return originalJson(body);
    };

    next();
  };
}

export default auditLog;
