/**
 * WhatsApp Service for eStokvel
 * Delivers OTP codes and temp PINs via Meta WhatsApp Cloud API.
 *
 * Two send modes (selected at runtime):
 *   template — uses a pre-approved Meta template (required for production)
 *   text     — sends a plain text message (development / sandbox test numbers only)
 *
 * Required env vars:
 *   WHATSAPP_ENABLED=true
 *   WHATSAPP_ACCESS_TOKEN=<system-user or temp token from Meta Developer Console>
 *   WHATSAPP_PHONE_NUMBER_ID=<numeric ID shown in Meta console — NOT the phone number>
 *
 * Optional env vars:
 *   WHATSAPP_OTP_TEMPLATE_NAME=estokvel_otp   (omit to use text mode)
 *   WHATSAPP_TEMPLATE_LANG=en_US              (default: en_US)
 *   WHATSAPP_API_VERSION=v19.0                (default: v19.0)
 */

import logger from '../utils/logger';

interface WAResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppService {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly templateName: string;
  private readonly templateLang: string;
  private readonly apiVersion: string;
  private readonly enabled: boolean;

  constructor() {
    this.accessToken    = process.env.WHATSAPP_ACCESS_TOKEN    || '';
    this.phoneNumberId  = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.templateName   = process.env.WHATSAPP_OTP_TEMPLATE_NAME || '';
    this.templateLang   = process.env.WHATSAPP_TEMPLATE_LANG    || 'en_US';
    this.apiVersion     = process.env.WHATSAPP_API_VERSION      || 'v19.0';
    this.enabled        = process.env.WHATSAPP_ENABLED === 'true';
  }

  private formatPhone(phone: string): string {
    let n = phone.replace(/[^\d]/g, '');
    if (n.startsWith('0') && n.length === 10) n = '27' + n.slice(1);
    else if (!n.startsWith('27') && n.length === 9) n = '27' + n;
    return n; // Meta API wants digits only, no leading +
  }

  private get apiUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
  }

  // ── Core send ────────────────────────────────────────────────────────────────

  private async postMessage(to: string, body: object): Promise<WAResult> {
    const payload = { messaging_product: 'whatsapp', to, ...body };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      const result: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        const err = result?.error?.message || `HTTP ${response.status}`;
        logger.warn(`WhatsApp send failed: to=${to} error=${err}`);
        return { success: false, error: err };
      }

      const messageId = result?.messages?.[0]?.id;
      logger.info(`WhatsApp sent: to=${to} messageId=${messageId}`);
      return { success: true, messageId };
    } catch (error: any) {
      const msg = error.name === 'TimeoutError' ? 'WhatsApp API timeout (8s)' : error.message;
      logger.error(`WhatsApp error: ${msg}`);
      return { success: false, error: msg };
    }
  }

  // ── Template message (production) ────────────────────────────────────────────
  // Template must be approved in Meta Business Manager before use.
  // Body variables are positional: {{1}}, {{2}} etc.

  async sendTemplate(to: string, variables: string[]): Promise<WAResult> {
    const components = variables.length
      ? [{ type: 'body', parameters: variables.map(v => ({ type: 'text', text: v })) }]
      : [];

    return this.postMessage(to, {
      type: 'template',
      template: {
        name: this.templateName,
        language: { code: this.templateLang },
        components,
      },
    });
  }

  // ── Text message (sandbox / development) ─────────────────────────────────────
  // Only works if the recipient has messaged your business number within 24h,
  // OR if their number is added as a test number in Meta Developer Console.

  async sendText(to: string, text: string): Promise<WAResult> {
    return this.postMessage(to, {
      type: 'text',
      text: { body: text, preview_url: false },
    });
  }

  // ── Public helpers ────────────────────────────────────────────────────────────

  async sendOTP(phoneNumber: string, otp: string): Promise<WAResult> {
    const to = this.formatPhone(phoneNumber);

    if (!this.enabled || process.env.NODE_ENV === 'development') {
      logger.info(`📱 WhatsApp OTP (dev mode): to=${to} otp=${otp}`);
      return { success: true, messageId: 'dev-wa-' + Date.now() };
    }

    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn('WHATSAPP_ENABLED=true but credentials not set — skipping');
      return { success: true, messageId: 'no-creds-' + Date.now() };
    }

    if (this.templateName) {
      // Production: use approved template, OTP is {{1}}
      return this.sendTemplate(to, [otp]);
    }

    // Fallback: plain text (only for sandbox test numbers)
    return this.sendText(to, `Your eStokvel code is: *${otp}*\n\nValid for 5 minutes. Do not share this code.`);
  }

  async sendTempPin(phoneNumber: string, name: string, pin: string, context: string): Promise<WAResult> {
    const to = this.formatPhone(phoneNumber);

    if (!this.enabled || process.env.NODE_ENV === 'development') {
      logger.info(`📱 WhatsApp TempPIN (dev mode): to=${to} pin=${pin} context=${context}`);
      return { success: true, messageId: 'dev-wa-' + Date.now() };
    }

    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn('WHATSAPP_ENABLED=true but credentials not set — skipping');
      return { success: true, messageId: 'no-creds-' + Date.now() };
    }

    const text = `Welcome to eStokvel, ${name}!\n\n${context}\n\nYour temporary PIN is: *${pin}*\n\nPlease change it on first login. Do not share this code.`;
    return this.sendText(to, text);
  }

  async sendPinResetConfirmation(phoneNumber: string, name: string): Promise<WAResult> {
    const to = this.formatPhone(phoneNumber);

    if (!this.enabled || process.env.NODE_ENV === 'development') {
      logger.info(`📱 WhatsApp PINReset confirm (dev mode): to=${to}`);
      return { success: true, messageId: 'dev-wa-' + Date.now() };
    }

    if (!this.accessToken || !this.phoneNumberId) {
      return { success: true, messageId: 'no-creds-' + Date.now() };
    }

    return this.sendText(
      to,
      `Hi ${name}, your eStokvel PIN has been successfully reset.\n\nIf you did not do this, contact your group admin immediately.`
    );
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
