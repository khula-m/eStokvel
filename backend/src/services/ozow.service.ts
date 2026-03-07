import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { TransactionStatus, TransactionType, PaymentMethod } from '../utils/enums';
import logger from '../utils/logger';

// ─── Ozow Configuration ───────────────────────────────────────────
const OZOW_SITE_CODE = process.env.OZOW_SITE_CODE || '';
const OZOW_PRIVATE_KEY = process.env.OZOW_PRIVATE_KEY || '';
const OZOW_API_KEY = process.env.OZOW_API_KEY || '';
const OZOW_IS_TEST = process.env.OZOW_IS_TEST === 'true';
const OZOW_BASE_URL = OZOW_IS_TEST
  ? 'https://stagingpay.ozow.com'
  : 'https://pay.ozow.com';
const OZOW_PAYOUT_URL = OZOW_IS_TEST
  ? 'https://stagingapi.ozow.com/postpayout'
  : 'https://api.ozow.com/postpayout';

// Callback URLs (base should be set in .env — e.g. https://yourdomain.com or ngrok URL)
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5000';
const OZOW_SUCCESS_URL = `${APP_BASE_URL}/api/ozow/success`;
const OZOW_ERROR_URL = `${APP_BASE_URL}/api/ozow/error`;
const OZOW_CANCEL_URL = `${APP_BASE_URL}/api/ozow/cancel`;
const OZOW_NOTIFY_URL = `${APP_BASE_URL}/api/ozow/notify`;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Generate Ozow SHA-512 hash for request integrity.
 * Ozow concatenates specific fields + private key → SHA-512 lowercase hex.
 */
function generateRequestHash(fields: string[]): string {
  const concatenated = fields.join('') + OZOW_PRIVATE_KEY;
  return crypto.createHash('sha512').update(concatenated).digest('hex').toLowerCase();
}

/**
 * Verify the hash that Ozow sends back in notifications.
 */
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

// ─── Types ────────────────────────────────────────────────────────

export interface OzowPaymentRequest {
  groupId: string;
  userId: string;
  amount: number;
  bankReference?: string;
}

export interface OzowPaymentResponse {
  success: boolean;
  url?: string;
  transactionId?: string;
  paymentData?: Record<string, string>;
  message?: string;
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

export interface OzowPayoutRequest {
  memberId: string;
  groupId: string;
  amount: number;
  reason?: string;
}

// ─── Service ──────────────────────────────────────────────────────

class OzowService {
  /**
   * Create a payment request and return the Ozow redirect URL.
   * The member will be redirected to Ozow to complete payment.
   */
  async initiatePayment(data: OzowPaymentRequest): Promise<OzowPaymentResponse> {
    try {
      const { groupId, userId, amount, bankReference } = data;

      // Validate config
      if (!OZOW_SITE_CODE || !OZOW_PRIVATE_KEY) {
        return { success: false, message: 'Ozow is not configured. Please set OZOW_SITE_CODE and OZOW_PRIVATE_KEY in .env' };
      }

      // Verify group exists
      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true, currency: true, isActive: true }
      });
      if (!group || !group.isActive) {
        return { success: false, message: 'Group not found or inactive' };
      }

      // Verify user is a member
      const membership = await prisma.member.findFirst({
        where: { userId, stokvelGroupId: groupId },
        include: { user: { select: { fullName: true, phoneNumber: true } } }
      });
      if (!membership) {
        return { success: false, message: 'You are not a member of this group' };
      }

      // Create a pending transaction in our DB first
      const refNumber = `OZW-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const transaction = await prisma.transaction.create({
        data: {
          stokvelGroupId: groupId,
          memberId: membership.id,
          transactionType: TransactionType.CONTRIBUTION,
          amount,
          paymentMethod: PaymentMethod.OZOW,
          transactionDate: new Date(),
          recordedById: userId,
          currency: group.currency,
          status: TransactionStatus.PENDING,
          referenceNumber: refNumber,
          notes: `Ozow payment initiated by ${membership.user.fullName}`,
        }
      });

      // Build Ozow payment request
      const countryCode = 'ZA';
      const currencyCode = 'ZAR';
      const amountStr = amount.toFixed(2);
      const transactionReference = transaction.id; // Use our transaction ID as reference
      const bankRef = bankReference || `${group.name} - ${membership.user.fullName}`;

      // Hash fields in Ozow-required order:
      // SiteCode + CountryCode + CurrencyCode + Amount + TransactionReference + BankReference +
      // Optional1-5 + CancelUrl + ErrorUrl + SuccessUrl + NotifyUrl + IsTest
      const hashFields = [
        OZOW_SITE_CODE,
        countryCode,
        currencyCode,
        amountStr,
        transactionReference,
        bankRef,
        '', '', '', '', '', // Optional1-5
        OZOW_CANCEL_URL,
        OZOW_ERROR_URL,
        OZOW_SUCCESS_URL,
        OZOW_NOTIFY_URL,
        OZOW_IS_TEST.toString(),
      ];

      const hashCheck = generateRequestHash(hashFields);

      // Build the POST data for Ozow
      const paymentData: Record<string, string> = {
        SiteCode: OZOW_SITE_CODE,
        CountryCode: countryCode,
        CurrencyCode: currencyCode,
        Amount: amountStr,
        TransactionReference: transactionReference,
        BankReference: bankRef,
        CancelUrl: OZOW_CANCEL_URL,
        ErrorUrl: OZOW_ERROR_URL,
        SuccessUrl: OZOW_SUCCESS_URL,
        NotifyUrl: OZOW_NOTIFY_URL,
        IsTest: OZOW_IS_TEST.toString(),
        HashCheck: hashCheck,
      };

      // The URL the member should be redirected to (POST these params)
      const ozowUrl = `${OZOW_BASE_URL}/pay`;

      return {
        success: true,
        url: ozowUrl,
        transactionId: transaction.id,
        paymentData,
        message: 'Payment initiated. Redirect user to Ozow.',
      };
    } catch (error: any) {
      logger.error('Ozow initiatePayment error:', error);
      return { success: false, message: error.message || 'Failed to initiate Ozow payment' };
    }
  }

  /**
   * Handle the notification webhook from Ozow.
   * This is called server-to-server — no auth required but hash verified.
   */
  async handleNotification(data: OzowNotification): Promise<{ success: boolean; message: string }> {
    try {
      // Verify the hash to prevent tampering
      if (!verifyNotificationHash(data)) {
        logger.error('Ozow notification hash mismatch! Possible tampering.');
        return { success: false, message: 'Invalid hash' };
      }

      const transactionId = data.TransactionReference;

      // Find our transaction
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          member: { include: { user: { select: { fullName: true } } } },
          group: { select: { name: true } }
        }
      });

      if (!transaction) {
        logger.error(`Ozow notification: Transaction ${transactionId} not found`);
        return { success: false, message: 'Transaction not found' };
      }

      // IDEMPOTENCY: Skip if transaction is already in a terminal state
      if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(transaction.status)) {
        logger.info(`Ozow notification: Transaction ${transactionId} already ${transaction.status}. Skipping duplicate.`);
        return { success: true, message: `Transaction already ${transaction.status}` };
      }

      // Map Ozow status to our status
      let newStatus: TransactionStatus;
      switch (data.Status?.toLowerCase()) {
        case 'complete':
          newStatus = TransactionStatus.COMPLETED;
          break;
        case 'cancelled':
        case 'abandoned':
          newStatus = TransactionStatus.CANCELLED;
          break;
        case 'error':
        case 'pendinginfail':
          newStatus = TransactionStatus.FAILED;
          break;
        case 'pending':
        case 'pendinginvestigation':
          newStatus = TransactionStatus.PENDING;
          break;
        default:
          newStatus = TransactionStatus.PENDING;
      }

      // Update transaction
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: newStatus,
          ozowTransactionId: data.TransactionId,
          ozowPaymentStatus: data.Status,
          paidAt: newStatus === TransactionStatus.COMPLETED ? new Date() : undefined,
          metadata: {
            ozowBankName: data.BankName || null,
            ozowMaskedAccount: data.MaskedAccountNumber || null,
            ozowStatusMessage: data.StatusMessage || null,
            ozowSubStatus: data.SubStatus || null,
            ozowPaymentDate: data.PaymentDate || null,
          },
        }
      });

      logger.info(`Ozow notification: Transaction ${transactionId} → ${newStatus} (Ozow: ${data.Status})`);

      return {
        success: true,
        message: `Transaction updated to ${newStatus}`
      };
    } catch (error: any) {
      logger.error('Ozow handleNotification error:', error);
      return { success: false, message: error.message || 'Failed to process notification' };
    }
  }

  /**
   * Handle redirect callbacks (success/error/cancel).
   * These are GET requests from the user's browser.
   * Returns info for the frontend to display.
   */
  async handleRedirect(transactionReference: string, type: 'success' | 'error' | 'cancel'): Promise<{ success: boolean; transactionId?: string; status?: string; message: string }> {
    try {
      if (!transactionReference) {
        return { success: false, message: 'No transaction reference provided' };
      }

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionReference },
        select: { id: true, status: true, amount: true, group: { select: { name: true } } }
      });

      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      // For cancel — mark as cancelled if still pending
      if (type === 'cancel' && transaction.status === 'PENDING') {
        await prisma.transaction.update({
          where: { id: transactionReference },
          data: { status: TransactionStatus.CANCELLED, ozowPaymentStatus: 'UserCancelled' }
        });
      }

      const messages = {
        success: `Payment of R ${Number(transaction.amount).toFixed(2)} to ${transaction.group.name} is being processed.`,
        error: 'Payment failed. Please try again.',
        cancel: 'Payment was cancelled.',
      };

      return {
        success: type === 'success',
        transactionId: transaction.id,
        status: transaction.status,
        message: messages[type],
      };
    } catch (error: any) {
      logger.error('Ozow handleRedirect error:', error);
      return { success: false, message: 'Failed to process redirect' };
    }
  }

  /**
   * Initiate a payout to a member via Ozow Payout API.
   * Used for automatic stokvel payouts.
   */
  async initiatePayout(data: OzowPayoutRequest): Promise<{ success: boolean; message: string; payoutId?: string }> {
    try {
      const { memberId, groupId, amount, reason } = data;

      if (!OZOW_API_KEY) {
        return { success: false, message: 'Ozow API key not configured for payouts' };
      }

      // Get member with bank details
      const member = await prisma.member.findUnique({
        where: { id: memberId },
        include: { user: { select: { fullName: true, phoneNumber: true } } }
      });

      if (!member) {
        return { success: false, message: 'Member not found' };
      }

      if (!member.payoutBankName || !member.payoutAccountNumber) {
        return { success: false, message: `${member.user.fullName} has not set up payout bank details` };
      }

      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        select: { id: true, name: true, currency: true }
      });

      if (!group) {
        return { success: false, message: 'Group not found' };
      }

      // Create payout transaction record
      const refNumber = `PYT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const transaction = await prisma.transaction.create({
        data: {
          stokvelGroupId: groupId,
          memberId: member.id,
          transactionType: TransactionType.PAYOUT,
          amount,
          paymentMethod: PaymentMethod.OZOW,
          transactionDate: new Date(),
          recordedById: member.userId, // Recorded by the system on behalf of member
          currency: group.currency,
          status: TransactionStatus.PENDING,
          referenceNumber: refNumber,
          notes: reason || `Automatic payout from ${group.name}`,
        }
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
          // Update transaction with Ozow payout ID
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              ozowTransactionId: result.payoutId,
              ozowPaymentStatus: 'PayoutInitiated',
            }
          });

          return {
            success: true,
            message: `Payout of R ${amount.toFixed(2)} initiated to ${member.user.fullName}`,
            payoutId: result.payoutId,
          };
        } else {
          // Mark as failed
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.FAILED,
              ozowPaymentStatus: result.errorMessage || 'PayoutFailed',
            }
          });

          return { success: false, message: result.errorMessage || 'Ozow payout API returned an error' };
        }
      } catch (fetchError: any) {
        // Network error — mark pending, might succeed later via webhook
        logger.error('Ozow payout API call failed:', fetchError.message);
        return { success: false, message: 'Failed to reach Ozow payout API. Transaction saved as pending.' };
      }
    } catch (error: any) {
      logger.error('Ozow initiatePayout error:', error);
      return { success: false, message: error.message || 'Failed to initiate payout' };
    }
  }

  /**
   * Handle payout notification from Ozow.
   */
  async handlePayoutNotification(data: any): Promise<{ success: boolean; message: string }> {
    try {
      const transactionRef = data.Reference || data.TransactionReference;
      if (!transactionRef) {
        return { success: false, message: 'No transaction reference in payout notification' };
      }

      const transaction = await prisma.transaction.findUnique({ where: { id: transactionRef } });
      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      const statusMap: Record<string, TransactionStatus> = {
        'complete': TransactionStatus.COMPLETED,
        'completed': TransactionStatus.COMPLETED,
        'failed': TransactionStatus.FAILED,
        'cancelled': TransactionStatus.CANCELLED,
      };

      const newStatus = statusMap[(data.Status || '').toLowerCase()] || TransactionStatus.PENDING;

      await prisma.transaction.update({
        where: { id: transactionRef },
        data: {
          status: newStatus,
          ozowPaymentStatus: data.Status,
          paidAt: newStatus === TransactionStatus.COMPLETED ? new Date() : undefined,
        }
      });

      logger.info(`Ozow payout notification: Transaction ${transactionRef} → ${newStatus}`);
      return { success: true, message: `Payout transaction updated to ${newStatus}` };
    } catch (error: any) {
      logger.error('Ozow payout notification error:', error);
      return { success: false, message: error.message || 'Failed to process payout notification' };
    }
  }

  /**
   * Check the status of an Ozow transaction via their API.
   * Useful for polling or manual status checks.
   */
  async checkTransactionStatus(transactionId: string): Promise<{ success: boolean; status?: string; message: string }> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        select: { id: true, status: true, ozowTransactionId: true, ozowPaymentStatus: true, paidAt: true }
      });

      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      return {
        success: true,
        status: transaction.status,
        message: transaction.ozowPaymentStatus
          ? `Ozow status: ${transaction.ozowPaymentStatus}`
          : `Transaction status: ${transaction.status}`,
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to check status' };
    }
  }
}

export const ozowService = new OzowService();
