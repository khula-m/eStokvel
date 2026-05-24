/**
 * SMS Service for eStokvel
 * Handles sending SMS notifications via Africa's Talking or other providers
 * 
 * In production, configure with actual API credentials
 */

import logger from '../utils/logger';

// SMS Templates
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

interface SMSMessage {
  to: string;
  message: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private _apiKey: string;
  private _username: string;
  private _senderId: string;
  private enabled: boolean;

  constructor() {
    this._apiKey = process.env.AT_API_KEY || '';
    this._username = process.env.AT_USERNAME || 'sandbox';
    this._senderId = process.env.SMS_SENDER_ID || 'eStokvel';
    this.enabled = process.env.SMS_ENABLED === 'true';
  }

  /**
   * Get SMS provider configuration (for debugging/logging)
   */
  getConfig(): { username: string; senderId: string; enabled: boolean; hasApiKey: boolean } {
    return {
      username: this._username,
      senderId: this._senderId,
      enabled: this.enabled,
      hasApiKey: !!this._apiKey,
    };
  }

  /**
   * Format phone number to international format for SMS
   */
  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/[^\d]/g, '');
    
    // Convert 0XX to +27XX for South Africa
    if (formatted.startsWith('0') && formatted.length === 10) {
      formatted = '+27' + formatted.slice(1);
    } else if (formatted.startsWith('27') && !formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }

  /**
   * Send a single SMS
   */
  async sendSMS(to: string, message: string): Promise<SMSResult> {
    const formattedNumber = this.formatPhoneNumber(to);
    
    // Log in development mode
    if (!this.enabled || process.env.NODE_ENV === 'development') {
      logger.info('📱 SMS (Development Mode):');
      logger.info(`   To: ${formattedNumber}`);
      logger.info(`   Message: ${message}`);
      return { success: true, messageId: 'dev-' + Date.now() };
    }

    try {
      if (!this._apiKey) {
        logger.warn('SMS_ENABLED=true but AT_API_KEY not set — skipping SMS');
        return { success: true, messageId: 'no-key-' + Date.now() };
      }

      logger.info(`SMS attempt: to=${formattedNumber} username=${this._username} keyLen=${this._apiKey.length}`);

      // Call Africa's Talking REST API directly (no SDK dependency).
      // Using Node 20's built-in fetch to avoid transitive vulnerabilities from the AT SDK.
      const isSandbox = this._username === 'sandbox';
      const apiUrl = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

      const params = new URLSearchParams({
        username: this._username,
        to: formattedNumber,
        message,
      });
      if (process.env.SMS_SENDER_ID) {
        params.set('from', process.env.SMS_SENDER_ID);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          apiKey: this._apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        logger.warn(`SMS HTTP error: status=${response.status} body=${errText}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      const result: any = await response.json();
      logger.info(`SMS raw response: ${JSON.stringify(result)}`);

      const msgData = result?.SMSMessageData?.Recipients?.[0];
      if (msgData?.statusCode === 101) {
        logger.info(`SMS sent successfully: to=${formattedNumber} messageId=${msgData.messageId}`);
        return { success: true, messageId: msgData.messageId };
      } else {
        const status = msgData?.status || result?.SMSMessageData?.Message || 'Unknown error';
        logger.warn(`SMS delivery issue: to=${formattedNumber} status=${status} statusCode=${msgData?.statusCode}`);
        return { success: false, error: status };
      }
    } catch (error: any) {
      const msg = error.name === 'TimeoutError' ? 'SMS provider timeout (8s)' : error.message;
      logger.error(`SMS Error: ${msg} username=${this._username}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResult[]> {
    const results: SMSResult[] = [];
    
    for (const msg of messages) {
      const result = await this.sendSMS(msg.to, msg.message);
      results.push(result);
    }
    
    return results;
  }

  // Notification helpers using templates
  
  async sendWelcome(phoneNumber: string, name: string): Promise<SMSResult> {
    return this.sendSMS(phoneNumber, SMS_TEMPLATES.WELCOME(name));
  }

  async sendContributionReceived(phoneNumber: string, name: string, amount: number, groupName: string): Promise<SMSResult> {
    return this.sendSMS(phoneNumber, SMS_TEMPLATES.CONTRIBUTION_RECEIVED(name, amount, groupName));
  }

  async sendContributionReminder(phoneNumber: string, name: string, amount: number, groupName: string, dueDate: string): Promise<SMSResult> {
    return this.sendSMS(phoneNumber, SMS_TEMPLATES.CONTRIBUTION_DUE(name, amount, groupName, dueDate));
  }

  async sendPayoutNotification(phoneNumber: string, name: string, amount: number, groupName: string): Promise<SMSResult> {
    return this.sendSMS(phoneNumber, SMS_TEMPLATES.PAYOUT_RECEIVED(name, amount, groupName));
  }

  async sendMeetingReminder(phoneNumber: string, groupName: string, date: string, time: string): Promise<SMSResult> {
    return this.sendSMS(phoneNumber, SMS_TEMPLATES.MEETING_REMINDER(groupName, date, time));
  }

  async sendGroupJoinedNotification(phoneNumber: string, name: string, groupName: string): Promise<SMSResult> {
    return this.sendSMS(phoneNumber, SMS_TEMPLATES.GROUP_JOINED(name, groupName));
  }
}

export const smsService = new SMSService();
export default smsService;
