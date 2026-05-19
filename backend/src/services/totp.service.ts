import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

const APP_NAME = 'eStokvel';

export class TotpService {
  /**
   * Generate a new TOTP secret and return the provisioning URI + QR code data URL.
   * Stores the secret (unverified) on the user record.
   * The superadmin must call verifyAndEnable() with a valid token to activate 2FA.
   */
  async setupTotp(userId: string): Promise<{ success: boolean; message?: string; qrCode?: string; secret?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, fullName: true, totpEnabled: true },
    });

    if (!user || user.role !== 'SUPERADMIN') {
      return { success: false, message: 'TOTP is only available for superadmin accounts' };
    }

    const secret = generateSecret();
    const account = user.email || user.fullName;
    const otpUri = generateURI({ label: account, secret, issuer: APP_NAME });

    // Save secret (not yet enabled — requires verification first)
    await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret, totpEnabled: false } });

    try {
      const qrCode = await QRCode.toDataURL(otpUri);
      return { success: true, qrCode, secret, message: 'Scan the QR code with your authenticator app, then call /verify to enable 2FA.' };
    } catch (err: any) {
      logger.error('[TOTP] QR code generation failed:', err.message);
      return { success: true, secret, message: 'QR generation failed — use the secret key manually in your authenticator app.' };
    }
  }

  /**
   * Verify a TOTP token and enable 2FA on the account.
   * Must be called after setupTotp() with the first token from the authenticator app.
   */
  async verifyAndEnable(userId: string, token: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, totpSecret: true },
    });

    if (!user || user.role !== 'SUPERADMIN') {
      return { success: false, message: 'TOTP is only available for superadmin accounts' };
    }
    if (!user.totpSecret) {
      return { success: false, message: 'TOTP not set up. Call /setup first.' };
    }

    if (!(await this.validate(user.totpSecret, token))) {
      return { success: false, message: 'Invalid TOTP token. Check your authenticator app and try again.' };
    }

    await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
    logger.info(`[TOTP] 2FA enabled for superadmin ${userId}`);
    return { success: true, message: '2FA enabled successfully. All future logins will require a TOTP token.' };
  }

  /**
   * Validate a TOTP token against the stored secret.
   * Used during the superadmin login flow when totpEnabled is true.
   * Returns a Promise — await it before trusting the result.
   */
  async validate(secret: string, token: string): Promise<boolean> {
    // otplib verify returns { valid: boolean } — extract the boolean
    const result = await verify({ token, secret }) as { valid: boolean };
    return result.valid;
  }
}

export const totpService = new TotpService();
