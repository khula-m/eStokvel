/**
 * SMS Client for the notification-service.
 * Handles sending SMS notifications via Africa's Talking or logs in dev mode.
 */

import type { Logger } from 'winston';

export const SMS_TEMPLATES = {
  WELCOME: (name: string) =>
    `Welcome to eStokvel, ${name}! Your account is ready. Download the app to manage your savings.`,

  CONTRIBUTION_RECEIVED: (name: string, amount: number, group: string) =>
    `Hi ${name}, your contribution of R${amount.toFixed(2)} to ${group} has been recorded. Thank you!`,

  CONTRIBUTION_DUE: (name: string, amount: number, group: string, dueDate: string) =>
    `Reminder: ${name}, your R${amount.toFixed(2)} contribution to ${group} is due on ${dueDate}.`,

  PAYOUT_RECEIVED: (name: string, amount: number, group: string) =>
    `Congratulations ${name}! You've received a payout of R${amount.toFixed(2)} from ${group}.`,

  MEETING_REMINDER: (group: string, date: string, time: string) =>
    `Reminder: ${group} meeting is scheduled for ${date} at ${time}. See you there!`,

  GROUP_JOINED: (name: string, group: string) =>
    `Welcome to ${group}, ${name}! You can now view contributions and group updates in the app.`,

  TRANSACTION_VERIFIED: (name: string, amount: number, type: string) =>
    `Hi ${name}, your ${type} of R${amount.toFixed(2)} has been verified by the group admin.`,

  PAYMENT_PENDING: (name: string, group: string) =>
    `Hi ${name}, you have a pending payment in ${group}. Please contact your group admin.`,
};

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const SMS_ENABLED = process.env.SMS_ENABLED === 'true';

function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/[^\d]/g, '');
  if (formatted.startsWith('0') && formatted.length === 10) {
    formatted = '+27' + formatted.slice(1);
  } else if (formatted.startsWith('27') && !formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  return formatted;
}

export async function sendSMS(to: string, message: string, logger: Logger): Promise<SMSResult> {
  const formattedNumber = formatPhoneNumber(to);

  if (!SMS_ENABLED || process.env.NODE_ENV === 'development') {
    logger.info(`SMS (Dev Mode): To: ${formattedNumber}, Message: ${message}`);
    return { success: true, messageId: 'dev-' + Date.now() };
  }

  // Production: call Africa's Talking or configured provider
  try {
    const AT_API_KEY = process.env.AT_API_KEY || '';
    const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
    const AT_SENDER_ID = process.env.SMS_SENDER_ID || 'eStokvel';

    if (!AT_API_KEY) {
      logger.warn('SMS API key not configured');
      return { success: false, error: 'SMS provider not configured' };
    }

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': AT_API_KEY,
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to: formattedNumber,
        message,
        from: AT_SENDER_ID,
      }),
    });

    const result: any = await response.json();

    if (response.ok) {
      const msgData = result?.SMSMessageData?.Recipients?.[0];
      return {
        success: msgData?.status === 'Success',
        messageId: msgData?.messageId,
        error: msgData?.status !== 'Success' ? msgData?.status : undefined,
      };
    } else {
      return { success: false, error: result?.message || 'SMS API error' };
    }
  } catch (error: any) {
    logger.error('SMS send error:', error.message);
    return { success: false, error: error.message };
  }
}
