/**
 * Ozow client — handles payout initiation and notification processing.
 * Extracted from the monolith's ozow.service.ts for the payout-service microservice.
 */

import crypto from 'crypto';
import type { PrismaClient } from '@prisma/client';
import type { Logger } from 'winston';

// ─── Ozow Configuration ───────────────────────────────────────────
const OZOW_SITE_CODE = process.env.OZOW_SITE_CODE || '';
const OZOW_PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY || '';
const OZOW_API_KEY = process.env.OZOW_API_KEY || '';
const OZOW_IS_TEST = process.env.OZOW_IS_TEST === 'true';
const OZOW_PAYOUT_URL = OZOW_IS_TEST
  ? 'https://stagingapi.ozow.com/postpayout'
  : 'https://api.ozow.com/postpayout';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5000';

// ─── Types ────────────────────────────────────────────────────────

export interface OzowPayoutRequest {
  memberId: string;
  groupId: string;
  amount: number;
  reason?: string;
}

export interface OzowNotification {
  SiteCode: string;
  TransactionId: string;
  TransactionReference: string;
  Amount: string;
  Status: string;
  Optional1?: string;
  Optional2?: string;
  Optional3?: string;
  Optional4?: string;
  Optional5?: string;
  CurrencyCode: string;
  IsTest?: boolean | string;
  StatusMessage?: string;
  Hash?: string;
  MaskedAccountNumber?: string;
  BankName?: string;
  SmartIndicator?: string;
  CreatedDate?: string;
  PaymentDate?: string;
  SubStatus?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function verifyNotificationHash(data: OzowNotification): boolean {
  const hashCheck = [
    data.SiteCode,
    data.TransactionId,
    data.TransactionReference,
    data.Amount,
    data.Status,
    data.Optional1 || '',
    data.Optional2 || '',
    data.Optional3 || '',
    data.Optional4 || '',
    data.Optional5 || '',
    data.CurrencyCode,
    data.IsTest?.toString() || '',
    data.StatusMessage || '',
  ].join('') + OZOW_PRIVATE_KEY;

  const expectedHash = crypto.createHash('sha512').update(hashCheck).digest('hex').toLowerCase();
  return expectedHash === (data.Hash || '').toLowerCase();
}

// ─── Payout Initiation ───────────────────────────────────────────

export async function initiateOzowPayout(
  data: OzowPayoutRequest,
  prisma: PrismaClient,
  logger: Logger
): Promise<{ success: boolean; message: string; payoutId?: string }> {
  try {
    const { memberId, groupId, amount, reason } = data;

    if (!OZOW_API_KEY) {
      return { success: false, message: 'Ozow API key not configured for payouts' };
    }

    const member = await (prisma as any).member.findUnique({
      where: { id: memberId },
      include: { user: { select: { fullName: true, phoneNumber: true } } },
    });

    if (!member) {
      return { success: false, message: 'Member not found' };
    }

    if (!member.payoutBankName || !member.payoutAccountNumber) {
      return { success: false, message: `${member.user.fullName} has not set up payout bank details` };
    }

    const group = await (prisma as any).stokvelGroup.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, currency: true },
    });

    if (!group) {
      return { success: false, message: 'Group not found' };
    }

    // Snapshot bank details at payout time
    const bankSnapshot = {
      bankName: member.payoutBankName,
      accountNumber: member.payoutAccountNumber,
      accountHolder: member.payoutAccountHolder || member.user.fullName,
      branchCode: member.payoutBranchCode || '',
    };

    const refNumber = `PYT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const transaction = await (prisma as any).transaction.create({
      data: {
        stokvelGroupId: groupId,
        memberId: member.id,
        transactionType: 'PAYOUT',
        amount,
        paymentMethod: 'OZOW',
        transactionDate: new Date(),
        recordedById: member.userId,
        currency: group.currency,
        status: 'PENDING',
        referenceNumber: refNumber,
        notes: reason || `Automatic payout from ${group.name}`,
        metadata: { payoutBankSnapshot: bankSnapshot },
      },
    });

    // Call Ozow Payout API
    const payoutBody = {
      SiteCode: OZOW_SITE_CODE,
      AccountNumber: member.payoutAccountNumber,
      BankName: member.payoutBankName,
      AccountHolderName: member.payoutAccountHolder || member.user.fullName,
      BranchCode: member.payoutBranchCode || '',
      Amount: amount.toFixed(2),
      Reference: transaction.id,
      NotifyUrl: `${APP_BASE_URL}/api/ozow/payout-notify`,
      IsTest: OZOW_IS_TEST,
    };

    try {
      const response = await fetch(OZOW_PAYOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ApiKey': OZOW_API_KEY,
          'Accept': 'application/json',
        },
        body: JSON.stringify(payoutBody),
      });

      const result: any = await response.json();

      if (response.ok && result.payoutId) {
        await (prisma as any).transaction.update({
          where: { id: transaction.id },
          data: {
            ozowTransactionId: result.payoutId,
            ozowPaymentStatus: 'PayoutInitiated',
          },
        });

        return {
          success: true,
          message: `Payout of R ${amount.toFixed(2)} initiated to ${member.user.fullName}`,
          payoutId: result.payoutId,
        };
      } else {
        await (prisma as any).transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            ozowPaymentStatus: result.errorMessage || 'PayoutFailed',
          },
        });

        return { success: false, message: result.errorMessage || 'Ozow payout API returned an error' };
      }
    } catch (fetchError: any) {
      logger.error('Ozow payout API call failed:', fetchError.message);
      return { success: false, message: 'Failed to reach Ozow payout API. Transaction saved as pending.' };
    }
  } catch (error: any) {
    logger.error('Ozow initiatePayout error:', error);
    return { success: false, message: error.message || 'Failed to initiate payout' };
  }
}

// ─── Notification Handling ────────────────────────────────────────

export async function handleOzowPayoutNotification(
  data: any,
  prisma: PrismaClient,
  logger: Logger
): Promise<{ success: boolean; message: string }> {
  try {
    const transactionRef = data.Reference || data.TransactionReference;
    if (!transactionRef) {
      return { success: false, message: 'No transaction reference in payout notification' };
    }

    const transaction = await (prisma as any).transaction.findUnique({ where: { id: transactionRef } });
    if (!transaction) {
      return { success: false, message: 'Transaction not found' };
    }

    // IDEMPOTENCY: Skip terminal states
    if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(transaction.status)) {
      logger.info(`Ozow payout notification: Transaction ${transactionRef} already ${transaction.status}. Skipping.`);
      return { success: true, message: `Payout transaction already ${transaction.status}` };
    }

    const statusMap: Record<string, string> = {
      'complete': 'COMPLETED',
      'completed': 'COMPLETED',
      'failed': 'FAILED',
      'cancelled': 'CANCELLED',
    };

    const newStatus = statusMap[(data.Status || '').toLowerCase()] || 'PENDING';

    await (prisma as any).transaction.update({
      where: { id: transactionRef },
      data: {
        status: newStatus,
        ozowPaymentStatus: data.Status,
        paidAt: newStatus === 'COMPLETED' ? new Date() : undefined,
      },
    });

    logger.info(`Ozow payout notification: Transaction ${transactionRef} → ${newStatus}`);
    return { success: true, message: `Payout transaction updated to ${newStatus}` };
  } catch (error: any) {
    logger.error('Ozow payout notification error:', error);
    return { success: false, message: error.message || 'Failed to process payout notification' };
  }
}

export async function handleOzowNotification(
  data: OzowNotification,
  prisma: PrismaClient,
  logger: Logger
): Promise<{ success: boolean; message: string }> {
  try {
    if (!verifyNotificationHash(data)) {
      logger.error('Ozow notification hash mismatch! Possible tampering.');
      return { success: false, message: 'Invalid hash' };
    }

    const transactionId = data.TransactionReference;

    const transaction = await (prisma as any).transaction.findUnique({
      where: { id: transactionId },
      include: {
        member: { include: { user: { select: { fullName: true } } } },
        group: { select: { name: true } },
      },
    });

    if (!transaction) {
      logger.error(`Ozow notification: Transaction ${transactionId} not found`);
      return { success: false, message: 'Transaction not found' };
    }

    // IDEMPOTENCY: Skip terminal states
    if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(transaction.status)) {
      logger.info(`Ozow notification: Transaction ${transactionId} already ${transaction.status}. Skipping.`);
      return { success: true, message: `Transaction already ${transaction.status}` };
    }

    const statusMap: Record<string, string> = {
      'complete': 'COMPLETED',
      'cancelled': 'CANCELLED',
      'abandoned': 'CANCELLED',
      'error': 'FAILED',
      'pendinginfail': 'FAILED',
      'pending': 'PENDING',
      'pendinginvestigation': 'PENDING',
    };

    const newStatus = statusMap[(data.Status || '').toLowerCase()] || 'PENDING';

    await (prisma as any).transaction.update({
      where: { id: transactionId },
      data: {
        status: newStatus,
        ozowTransactionId: data.TransactionId,
        ozowPaymentStatus: data.Status,
        paidAt: newStatus === 'COMPLETED' ? new Date() : undefined,
        metadata: {
          ozowBankName: data.BankName || null,
          ozowMaskedAccount: data.MaskedAccountNumber || null,
          ozowStatusMessage: data.StatusMessage || null,
          ozowSubStatus: data.SubStatus || null,
          ozowPaymentDate: data.PaymentDate || null,
        },
      },
    });

    logger.info(`Ozow notification: Transaction ${transactionId} → ${newStatus} (Ozow: ${data.Status})`);
    return { success: true, message: `Transaction updated to ${newStatus}` };
  } catch (error: any) {
    logger.error('Ozow handleNotification error:', error);
    return { success: false, message: error.message || 'Failed to process notification' };
  }
}
