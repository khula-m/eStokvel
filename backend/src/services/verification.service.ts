/**
 * Smile Identity Verification Service
 * 
 * Placeholder for async identity verification via Smile Identity API.
 * Configure SMILE_PARTNER_ID, SMILE_API_KEY, and SMILE_CALLBACK_URL
 * environment variables when API keys are available.
 * 
 * Flow:
 * 1. User submits ID number → stored hashed, status = PENDING_VERIFY
 * 2. Background job calls Smile Identity to verify (within 72 hours)
 * 3. Callback/poll updates status to VERIFIED or FAILED
 * 4. Payouts are gated to VERIFIED users only
 */

import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

interface VerificationRequest {
  userId: string;
  firstName: string;
  lastName: string;
  idNumber: string;        // Plain text (NOT stored — only sent to Smile Identity)
  dateOfBirth?: string;     // YYYY-MM-DD extracted from ID
  phoneNumber?: string;
}

interface VerificationResult {
  success: boolean;
  jobId?: string;
  status?: 'pending' | 'verified' | 'failed';
  message: string;
}

export class VerificationService {
  private partnerId: string;
  private apiKey: string;
  private callbackUrl: string;
  private enabled: boolean;

  constructor() {
    this.partnerId = process.env.SMILE_PARTNER_ID || '';
    this.apiKey = process.env.SMILE_API_KEY || '';
    this.callbackUrl = process.env.SMILE_CALLBACK_URL || '';
    this.enabled = !!(this.partnerId && this.apiKey && this.callbackUrl);
  }

  /**
   * Submit identity verification request to Smile Identity
   * In production, this calls the Smile Identity Enhanced KYC API
   */
  async submitVerification(data: VerificationRequest): Promise<VerificationResult> {
    if (!this.enabled) {
      logger.info('Smile Identity not configured — marking user as PENDING_VERIFY (manual review)');
      logger.info(`   User: ${data.userId}`);
      logger.info(`   Name: ${data.firstName} ${data.lastName}`);
      logger.info(`   ID: ${data.idNumber.substring(0, 4)}*********`);

      // Mark as PENDING_VERIFY — will be manually verified or auto-verified once API is configured
      await prisma.user.update({
        where: { id: data.userId },
        data: { verificationStatus: 'PENDING_VERIFY' },
      });

      return {
        success: true,
        status: 'pending',
        message: 'Identity verification submitted. You will be notified once verified.',
      };
    }

    // ──── Production: Smile Identity Enhanced KYC ────
    // When API keys are available, replace this block with actual API call:
    //
    // const response = await fetch('https://api.smileidentity.com/v1/id_verification', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     partner_id: this.partnerId,
    //     source_sdk: 'rest_api',
    //     id_type: 'NATIONAL_ID',
    //     id_number: data.idNumber,
    //     first_name: data.firstName,
    //     last_name: data.lastName,
    //     dob: data.dateOfBirth,
    //     phone_number: data.phoneNumber,
    //     country: 'ZA',
    //     callback_url: this.callbackUrl,
    //   }),
    // });

    logger.info(`Smile Identity verification submitted for user ${data.userId}`);

    await prisma.user.update({
      where: { id: data.userId },
      data: { verificationStatus: 'PENDING_VERIFY' },
    });

    return {
      success: true,
      status: 'pending',
      message: 'Identity verification submitted. You will be notified once verified.',
    };
  }

  /**
   * Handle Smile Identity callback (webhook)
   * Called when verification result is ready
   */
  async handleCallback(payload: {
    userId: string;
    resultCode: string;
    resultText: string;
  }): Promise<void> {
    const { userId, resultCode, resultText } = payload;

    const isVerified = resultCode === '0810' || resultCode === '0820'; // Smile Identity success codes

    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationStatus: isVerified ? 'VERIFIED' : 'FAILED',
        verifiedAt: isVerified ? new Date() : null,
      },
    });

    logger.info(`Verification ${isVerified ? 'PASSED' : 'FAILED'} for user ${userId}: ${resultText}`);
  }

  /**
   * Check if a user is eligible for payouts (must be VERIFIED)
   */
  async isPayoutEligible(userId: string): Promise<{ eligible: boolean; reason?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verificationStatus: true, firstName: true, lastName: true },
    });

    if (!user) {
      return { eligible: false, reason: 'User not found' };
    }

    if (user.verificationStatus === 'VERIFIED') {
      return { eligible: true };
    }

    const reasons: Record<string, string> = {
      UNVERIFIED: 'Please submit your ID number for verification before receiving payouts.',
      PENDING_VERIFY: 'Your identity verification is still being processed. Payouts will be available once verified.',
      FAILED: 'Identity verification failed. Please contact support.',
    };

    return {
      eligible: false,
      reason: reasons[user.verificationStatus] || 'Verification required for payouts.',
    };
  }
}

export default new VerificationService();
