import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../utils/jwt';
import { getRedisClient, isRedisReady } from '../utils/redis';
import { REVOKE_PREFIX } from '../middleware/auth.middleware';
import { validatePin } from '../utils/validation';
import { validateSAId } from '../utils/saIdValidation';
import { cacheGetOrSet } from '../utils/redis';
import smsService from './sms.service';
import verificationService from './verification.service';

// ============ CONSTANTS ============
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SUPERADMIN_TOKEN_EXPIRY = '2h'; // Shorter expiry for superadmin

// Forgot-PIN constants
const OTP_EXPIRY_MS = 5 * 60 * 1000;          // 5 minutes
const OTP_COOLDOWN_MS = 60 * 1000;             // 1 minute between requests
const MAX_OTP_REQUESTS_PER_HOUR = 5;
const MAX_OTP_VERIFY_ATTEMPTS = 3;
const PIN_RESET_SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes to set new PIN after OTP verified

// ============ INTERFACES ============

interface CreateAdminInput {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  groupId?: string; // Optional: immediately assign as admin of a group
}

interface AddMemberInput {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  groupId: string;
}

interface LoginInput {
  phoneNumber: string;
  pin: string;
}

interface SuperadminLoginInput {
  email: string;
  password: string;
}

interface ChangePinInput {
  currentPin: string;
  newPin: string;
}

export class AuthService {

  /**
   * Generate a random 5-digit temp PIN (avoids common/sequential PINs)
   */
  private generateTempPin(): string {
    let pin: string;
    do {
      pin = Math.floor(10000 + Math.random() * 90000).toString();
    } while (!validatePin(pin).isValid); // Regenerate if it fails complexity rules
    return pin;
  }

  /**
   * Normalize SA phone number to 0XXXXXXXXX format
   */
  private normalizePhone(raw: string): string | null {
    let phone = raw.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('27') && phone.length === 11) {
      phone = '0' + phone.slice(2);
    }
    if (!/^0\d{9}$/.test(phone)) return null;
    return phone;
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, phoneNumber: string, role: string): string {
    return jwt.sign(
      { userId, phoneNumber, role },
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
    );
  }

  // ============ SUPERADMIN: Create Admin ============
  async createAdmin(data: CreateAdminInput, createdById: string) {
    const phoneNumber = this.normalizePhone(data.phoneNumber);
    if (!phoneNumber) {
      return { success: false, message: 'Phone number must be 10 digits (e.g., 0831234567)' };
    }

    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    if (!firstName || firstName.length < 2) {
      return { success: false, message: 'First name must be at least 2 characters' };
    }
    if (!lastName || lastName.length < 1) {
      return { success: false, message: 'Last name is required' };
    }
    const fullName = `${firstName} ${lastName}`;

    const existing = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existing) {
      if (data.groupId) {
        const existingMember = await prisma.member.findUnique({
          where: { userId_stokvelGroupId: { userId: existing.id, stokvelGroupId: data.groupId } }
        });
        if (existingMember) {
          await prisma.member.update({
            where: { id: existingMember.id },
            data: { role: 'ADMIN' }
          });
          return {
            success: true,
            data: { admin: existing },
            message: `"${existing.fullName}" has been promoted to admin for this group`
          };
        }
        await prisma.member.create({
          data: { userId: existing.id, stokvelGroupId: data.groupId, role: 'ADMIN' }
        });
        return {
          success: true,
          data: { admin: existing },
          message: `"${existing.fullName}" added as admin for this group`
        };
      }
      return { success: false, message: 'User with this phone number already exists' };
    }

    const tempPin = this.generateTempPin();
    const hashedPin = await bcrypt.hash(tempPin, 10);

    const admin = await prisma.user.create({
      data: {
        phoneNumber,
        firstName,
        lastName,
        fullName,
        pin: hashedPin,
        // Admin status is per-group (Member.role), not a global user property.
        // Using 'ADMIN' here would bleed admin UI into every group this person joins later.
        role: 'MEMBER',
        mustChangePin: true,
        isVerified: true,
        createdById,
      },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        fullName: true,
        role: true,
        createdAt: true,
      }
    });

    if (data.groupId) {
      await prisma.member.create({
        data: { userId: admin.id, stokvelGroupId: data.groupId, role: 'ADMIN' }
      });
    }

    try {
      await smsService.sendSMS(
        phoneNumber,
        `Welcome to eStokvel, ${firstName}! You have been registered as an Admin. Your login PIN is: ${tempPin}. Please change it on first login. Download the app to get started.`
      );
    } catch (smsError) {
      console.warn('Failed to send SMS to new admin:', smsError);
    }

    return {
      success: true,
      data: {
        admin,
        tempPin,
      },
      message: `Admin "${fullName}" created. Temp PIN: ${tempPin}. An SMS has been sent to ${phoneNumber}.`
    };
  }

  // ============ ADMIN: Add Member to Group ============
  // Admin provides firstName, lastName, phone only — member enters own ID on first login
  async addMember(data: AddMemberInput, createdById: string) {
    const phoneNumber = this.normalizePhone(data.phoneNumber);
    if (!phoneNumber) {
      return { success: false, message: 'Phone number must be 10 digits (e.g., 0831234567)' };
    }

    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    if (!firstName || firstName.length < 2) {
      return { success: false, message: 'First name must be at least 2 characters' };
    }
    if (!lastName || lastName.length < 1) {
      return { success: false, message: 'Last name is required' };
    }
    const fullName = `${firstName} ${lastName}`;

    // Verify group exists and is active
    const group = await prisma.stokvelGroup.findUnique({
      where: { id: data.groupId },
      select: { id: true, name: true, isActive: true, contributionAmount: true, durationMonths: true }
    });
    if (!group) {
      return { success: false, message: 'Group not found' };
    }
    if (!group.isActive) {
      return { success: false, message: 'This group is no longer active' };
    }
    const callerMembership = await prisma.member.findFirst({
      where: { userId: createdById, stokvelGroupId: data.groupId, role: 'ADMIN' }
    });
    if (!callerMembership) {
      return { success: false, message: 'Only the group admin can add members' };
    }

    const tempPin = this.generateTempPin();
    const hashedPin = await bcrypt.hash(tempPin, 10);

    let user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (user) {
      const existingMember = await prisma.member.findUnique({
        where: { userId_stokvelGroupId: { userId: user.id, stokvelGroupId: group.id } }
      });
      if (existingMember) {
        return { success: false, message: `${user.fullName} is already a member of this group` };
      }
    } else {
      user = await prisma.user.create({
        data: {
          phoneNumber,
          firstName,
          lastName,
          fullName,
          pin: hashedPin,
          role: 'MEMBER',
          mustChangePin: true,
          isVerified: true,
          createdById,
        }
      });
    }

    const membership = await prisma.member.create({
      data: {
        userId: user.id,
        stokvelGroupId: group.id,
        role: 'MEMBER',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, fullName: true, phoneNumber: true } },
        group: { select: { id: true, name: true, code: true } }
      }
    });

    try {
      await smsService.sendSMS(
        phoneNumber,
        `Welcome to eStokvel, ${firstName}! You've been added to "${group.name}". Login with your phone number. Your temp PIN is: ${tempPin}. Please change it on first login.`
      );
    } catch (smsError) {
      console.warn('Failed to send SMS to new member:', smsError);
    }

    return {
      success: true,
      data: {
        member: membership,
        tempPin,
        smsMessage: `You've been added to \"${group.name}\". Download the app and login with your phone number. Your temp PIN is: ${tempPin}`,
      },
      message: `Member \"${fullName}\" added to \"${group.name}\". Temp PIN: ${tempPin}. An SMS has been sent to ${phoneNumber}.`
    };
  }

  // ============ LOGIN (Phone + PIN) — ADMIN & MEMBER ONLY ============
  async login(data: LoginInput) {
    // Accept 5-digit PINs during the migration window (existing users who haven't changed yet)
    if (!data.pin || data.pin.length < 5 || data.pin.length > 6) {
      return { success: false, message: 'PIN must be 5 or 6 digits' };
    }

    const phoneNumber = this.normalizePhone(data.phoneNumber);
    if (!phoneNumber) {
      return { success: false, message: 'Phone number must be 10 digits (e.g., 0831234567)' };
    }

    // Per-phone rate limit: max 10 attempts per hour regardless of source IP.
    // Defends against distributed botnet attacks that bypass IP-based limits.
    if (isRedisReady()) {
      const phoneKey = `rl:login:phone:${phoneNumber}`;
      const attempts = await getRedisClient()!.incr(phoneKey);
      if (attempts === 1) await getRedisClient()!.expire(phoneKey, 3600);
      if (attempts > 10) {
        return { success: false, message: 'Too many login attempts for this phone number. Try again in 1 hour.' };
      }
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        fullName: true,
        pin: true,
        role: true,
        mustChangePin: true,
        isVerified: true,
        email: true,
        language: true,
        createdAt: true,
        lastLogin: true,
        failedAttempts: true,
        lockedUntil: true,
        verificationStatus: true,
        idNumberHash: true,
      }
    });

    if (!user) {
      return { success: false, message: 'Invalid phone number or PIN' };
    }

    // Block SUPERADMIN from mobile PIN login
    if (user.role === 'SUPERADMIN') {
      return { success: false, message: 'Superadmins must use the web portal to login' };
    }

    // Check account lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return {
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
        locked: true,
        minutesLeft,
      };
    }

    // Verify PIN
    if (!user.pin) {
      return { success: false, message: 'Account not configured for PIN login' };
    }
    const isPinValid = await bcrypt.compare(data.pin, user.pin);
    if (!isPinValid) {
      // Increment failed attempts
      const newFailedAttempts = (user.failedAttempts || 0) + 1;
      const updateData: any = { failedAttempts: newFailedAttempts };

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await prisma.user.update({ where: { id: user.id }, data: updateData });
        return {
          success: false,
          message: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in 30 minutes.`,
          locked: true,
          minutesLeft: 30,
        };
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });
      const attemptsLeft = MAX_FAILED_ATTEMPTS - newFailedAttempts;
      return {
        success: false,
        message: `Invalid phone number or PIN. ${attemptsLeft} attempt(s) remaining before account lock.`,
      };
    }

    // Successful login � reset failed attempts and lockout
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), failedAttempts: 0, lockedUntil: null }
    });

    const token = this.generateToken(user.id, user.phoneNumber, user.role);

    // Fetch memberships with per-group roles
    const memberships = await prisma.member.findMany({
        where: { userId: user.id },
        include: {
          group: {
            select: {
              id: true, name: true, code: true,
              contributionAmount: true, contributionFrequency: true,
              durationMonths: true, startDate: true, endDate: true,
              isActive: true,
              _count: { select: { members: true, transactions: true } }
            }
          }
        }
      });

    // Admin status is per-group only — derive from Member.role, never from User.role.
    // User.role === 'ADMIN' (set by old createAdmin) must NOT override this — a person
    // added as a plain member to a different group must not see admin controls there.
    const adminMemberships = memberships.filter((m: any) => m.role === 'ADMIN');
    const isGroupAdmin = adminMemberships.length > 0;
    const effectiveRole = user.role === 'SUPERADMIN' ? 'SUPERADMIN' : (isGroupAdmin ? 'ADMIN' : 'MEMBER');

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          effectiveRole,
          mustChangePin: user.mustChangePin,
          verificationStatus: user.verificationStatus,
          needsIdVerification: !user.idNumberHash, // True if user hasn't submitted ID yet
          email: user.email,
          language: user.language,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          memberships: memberships.map((m: any) => ({
            id: m.id,
            role: m.role, // Per-group role: 'ADMIN' or 'MEMBER'
            groupId: m.stokvelGroupId,
            groupName: m.group.name,
            groupCode: m.group.code,
            groupActive: m.group.isActive,
            memberCount: m.group._count.members,
          })),
          // Backward-compatible fields
          managedGroups: adminMemberships.map((m: any) => ({
            id: m.group.id,
            name: m.group.name,
            code: m.group.code,
            contributionAmount: m.group.contributionAmount,
            durationMonths: m.group.durationMonths,
            startDate: m.group.startDate,
            endDate: m.group.endDate,
            isActive: m.group.isActive,
            _count: m.group._count,
          })),
          managedGroup: adminMemberships.length > 0 ? {
            id: adminMemberships[0].group.id,
            name: adminMemberships[0].group.name,
            code: adminMemberships[0].group.code,
          } : null,
        },
        token,
      },
      message: user.mustChangePin
        ? 'Login successful. Please change your PIN.'
        : 'Login successful'
    };
  }

  // ============ SUPERADMIN: Delete Admin ============
  async deleteAdmin(adminId: string, requesterId: string) {
    if (adminId === requesterId) {
      return { success: false, message: 'You cannot delete yourself' };
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, fullName: true, role: true }
    });

    if (!admin) {
      return { success: false, message: 'Admin not found' };
    }

    // Prevent deleting other superadmins
    if (admin.role === 'SUPERADMIN') {
      return { success: false, message: 'Cannot delete a SUPERADMIN account' };
    }

    try {
      // ATOMIC: All cascading deletes in a single transaction to prevent corrupt state
      await prisma.$transaction(async (tx: any) => {
        // 1. Delete meeting attendance for this user
        await tx.meetingAttendance.deleteMany({ where: { userId: adminId } });
        // 2. Delete announcement reads for this user
        await tx.announcementRead.deleteMany({ where: { userId: adminId } });
        // 3. Delete chat replies by this user
        await tx.chatReply.deleteMany({ where: { senderId: adminId } });
        // 4. Delete chat messages by this user
        await tx.chatMessage.deleteMany({ where: { senderId: adminId } });
        // 5. Delete meetings created by this user
        await tx.meeting.deleteMany({ where: { createdBy: adminId } });
        // 6. Delete announcements created by this user
        await tx.announcement.deleteMany({ where: { createdBy: adminId } });
        // 6.5. Delete transactions referencing this admin's member records (FK: memberId ? Member)
        const adminMemberIds = await tx.member.findMany({
          where: { userId: adminId },
          select: { id: true }
        });
        if (adminMemberIds.length > 0) {
          await tx.transaction.deleteMany({
            where: { memberId: { in: adminMemberIds.map((m: { id: string }) => m.id) } }
          });
        }
        // 7. Delete memberships
        await tx.member.deleteMany({ where: { userId: adminId } });
        // 8. Nullify createdById on users this admin created
        await tx.user.updateMany({ where: { createdById: adminId }, data: { createdById: null } });
        // 9. Handle groups they created � set createdById to requester
        await tx.stokvelGroup.updateMany({ where: { createdById: adminId }, data: { createdById: requesterId } });
        // 10. Reassign transactions recorded by this admin
        await tx.transaction.updateMany({ where: { recordedById: adminId }, data: { recordedById: requesterId } });
        // 11. Finally delete the user
        await tx.user.delete({ where: { id: adminId } });
      }, {
        timeout: 15000, // 15s timeout for cascading deletes
      });

      return {
        success: true,
        message: `Admin "${admin.fullName}" has been removed from the system`
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete admin. No changes were made.'
      };
    }
  }

  // ============ SUPERADMIN LOGIN (Email + Password + TOTP) ============
  async superadminLogin(data: SuperadminLoginInput & { totpToken?: string }, ipAddress?: string) {
    if (!data.email || !data.password) {
      return { success: false, message: 'Email and password are required' };
    }

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      select: {
        id: true,
        phoneNumber: true,
        fullName: true,
        password: true,
        role: true,
        email: true,
        language: true,
        createdAt: true,
        lastLogin: true,
        failedAttempts: true,
        lockedUntil: true,
        totpSecret: true,
        totpEnabled: true,
      }
    });

    if (!user || user.role !== 'SUPERADMIN') {
      return { success: false, message: 'Invalid credentials' };
    }

    // Check lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return { success: false, message: `Account locked. Try again in ${minutesLeft} minute(s).`, locked: true };
    }

    if (!user.password) {
      return { success: false, message: 'Account not configured for password login' };
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      const newFailedAttempts = (user.failedAttempts || 0) + 1;
      const updateData: any = { failedAttempts: newFailedAttempts };
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      return { success: false, message: 'Invalid credentials' };
    }

    // TOTP check — required once enabled
    if (user.totpEnabled && user.totpSecret) {
      if (!data.totpToken) {
        return { success: false, message: '2FA token required', requiresTotp: true };
      }
      const { totpService } = await import('./totp.service');
      if (!(await totpService.validate(user.totpSecret, data.totpToken))) {
        return { success: false, message: 'Invalid 2FA token. Check your authenticator app.' };
      }
    }

    // Success — reset failed attempts, log IP
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), lastLoginIp: ipAddress || null, failedAttempts: 0, lockedUntil: null },
    });

    const token = jwt.sign(
      { userId: user.id, phoneNumber: user.phoneNumber, role: user.role },
      JWT_SECRET as jwt.Secret,
      { expiresIn: SUPERADMIN_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"] }
    );

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          language: user.language,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          totpEnabled: user.totpEnabled,
        },
        token,
      },
      message: 'Superadmin login successful',
    };
  }

  // ============ CHANGE PIN (5-digit with complexity rules) ============
  async changePin(userId: string, data: ChangePinInput) {
    // Validate new PIN with complexity rules
    const pinValidation = validatePin(data.newPin);
    if (!pinValidation.isValid) {
      return { success: false, message: pinValidation.message || 'Invalid PIN' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pin: true, role: true }
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.role === 'SUPERADMIN') {
      return { success: false, message: 'Superadmins use password authentication, not PINs' };
    }

    if (!user.pin) {
      return { success: false, message: 'Account not configured for PIN authentication' };
    }

    const isCurrentPinValid = await bcrypt.compare(data.currentPin, user.pin);
    if (!isCurrentPinValid) {
      return { success: false, message: 'Current PIN is incorrect' };
    }

    if (data.currentPin === data.newPin) {
      return { success: false, message: 'New PIN must be different from current PIN' };
    }

    const hashedPin = await bcrypt.hash(data.newPin, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { pin: hashedPin, mustChangePin: false }
    });

    // Revoke all previously issued tokens for this user.
    // Any token with iat < now will be rejected by auth middleware.
    if (isRedisReady()) {
      const nowSec = Math.floor(Date.now() / 1000);
      const TOKEN_MAX_AGE_SEC = 7 * 24 * 3600; // matches longest possible token life (7d dev)
      await getRedisClient()!.set(`${REVOKE_PREFIX}${userId}`, String(nowSec), 'EX', TOKEN_MAX_AGE_SEC);
    }

    return { success: true, message: 'PIN changed successfully' };
  }

  // ============ GET CURRENT USER ============
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        fullName: true,
        email: true,
        role: true,
        isVerified: true,
        language: true,
        createdAt: true,
        lastLogin: true,
        mustChangePin: true,
      }
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    return {
      success: true,
      data: { user },
      message: 'User retrieved successfully'
    };
  }

  // ============ SUPERADMIN: List all admins ============
  async listAdmins() {
    // 1. Users who are ADMIN of at least one group
    const adminMembers = await prisma.member.findMany({
      where: { role: 'ADMIN' },
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            fullName: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
            lastLogin: true,
            verificationStatus: true,
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: { select: { members: true } }
          }
        }
      }
    });

    // Group by user
    const adminMap = new Map<string, any>();
    for (const m of adminMembers) {
      if (!adminMap.has(m.user.id)) {
        adminMap.set(m.user.id, {
          ...m.user,
          managedGroups: []
        });
      }
      adminMap.get(m.user.id)!.managedGroups.push(m.group);
    }

    // 2. Also include SUPERADMIN users and all ADMIN-role users (self-registered or created by superadmin)
    const superAndCreated = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'SUPERADMIN' },
          { role: 'ADMIN' },
        ]
      },
      select: {
        id: true,
        phoneNumber: true,
        fullName: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        verificationStatus: true,
      }
    });
    for (const u of superAndCreated) {
      if (!adminMap.has(u.id)) {
        adminMap.set(u.id, { ...u, managedGroups: [] });
      }
    }

    const admins = Array.from(adminMap.values());

    return {
      success: true,
      data: { admins, count: admins.length },
      message: `Found ${admins.length} admin(s)`
    };
  }

  // ============ SUPERADMIN: List all members ============
  async listMembers(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where: { role: 'MEMBER' },
        include: {
          user: {
            select: {
              id: true,
              phoneNumber: true,
              fullName: true,
              firstName: true,
              lastName: true,
              role: true,
              createdAt: true,
              lastLogin: true,
              verificationStatus: true,
            }
          },
          group: {
            select: {
              id: true,
              name: true,
              isActive: true,
            }
          }
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.member.count({ where: { role: 'MEMBER' } }),
    ]);

    // Group by user for a cleaner response
    const userMap = new Map<string, any>();
    for (const m of members) {
      if (!userMap.has(m.user.id)) {
        userMap.set(m.user.id, {
          ...m.user,
          groups: [],
          paymentStatus: m.paymentStatus,
        });
      }
      userMap.get(m.user.id)!.groups.push({
        ...m.group,
        memberId: m.id,
        paymentStatus: m.paymentStatus,
        joinedAt: m.joinedAt,
      });
    }

    const data = Array.from(userMap.values());

    return {
      success: true,
      data: { members: data, total, page, limit },
      message: `Found ${data.length} member(s)`
    };
  }

  // ============ SUPERADMIN: System overview ============
  async getSystemOverview() {
    return cacheGetOrSet('system:overview', 60, async () => {
      const [adminMemberCount, groupCount, totalUserCount, transactionAgg, verificationCounts] = await Promise.all([
        // Count distinct users who are admin of at least one group
        prisma.member.groupBy({ by: ['userId'], where: { role: 'ADMIN' } }).then((r: any[]) => r.length),
        prisma.stokvelGroup.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: { in: ['MEMBER', 'ADMIN'] } } }), // All non-superadmin users
        prisma.transaction.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.user.groupBy({
          by: ['verificationStatus'],
          where: { role: { in: ['MEMBER', 'ADMIN'] } },
          _count: true,
        }),
      ]);

      // Build verification stats from groupBy result
      const verificationMap: Record<string, number> = {};
      for (const row of verificationCounts) {
        verificationMap[row.verificationStatus] = row._count;
      }

      return {
        success: true,
        data: {
          admins: adminMemberCount,
          groups: groupCount,
          members: totalUserCount,
          totalCollected: Number(transactionAgg._sum.amount || 0),
          totalTransactions: transactionAgg._count,
          verification: {
            verified: verificationMap['VERIFIED'] || 0,
            pending: verificationMap['PENDING_VERIFY'] || 0,
            unverified: verificationMap['UNVERIFIED'] || 0,
            failed: verificationMap['FAILED'] || 0,
          },
        },
        message: 'System overview retrieved'
      };
    });
  }

  // ============ FORGOT PIN: Step 1 – Request OTP ============
  async requestForgotPin(phoneNumber: string) {
    const normalized = this.normalizePhone(phoneNumber);
    if (!normalized) {
      return { success: false, message: 'Phone number must be 10 digits (e.g., 0831234567)' };
    }

    // Check that the user exists and is not SUPERADMIN
    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalized },
      select: { id: true, role: true, fullName: true, lockedUntil: true },
    });
    if (!user || user.role === 'SUPERADMIN') {
      // Don't reveal whether the number exists
      return { success: true, message: 'If this number is registered, you will receive an OTP via SMS.' };
    }

    // Check account lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return { success: false, message: 'Account is locked. Please try again later.' };
    }

    // Rate limit: max 1 request per 60 seconds
    const recentOTP = await prisma.pinResetOTP.findFirst({
      where: {
        phoneNumber: normalized,
        createdAt: { gte: new Date(Date.now() - OTP_COOLDOWN_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recentOTP) {
      return { success: false, message: 'Please wait 60 seconds before requesting another OTP.' };
    }

    // Rate limit: max 5 requests per hour
    const hourlyCount = await prisma.pinResetOTP.count({
      where: {
        phoneNumber: normalized,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (hourlyCount >= MAX_OTP_REQUESTS_PER_HOUR) {
      return { success: false, message: 'Too many OTP requests. Please try again in an hour.' };
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    await prisma.pinResetOTP.create({
      data: {
        phoneNumber: normalized,
        otpHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
      },
    });

    // Send OTP via SMS
    try {
      await smsService.sendSMS(
        normalized,
        `Your eStokvel PIN reset code is: ${otp}. It expires in 5 minutes. Do not share this code.`
      );
    } catch (smsError) {
      console.warn('Failed to send OTP SMS:', smsError);
    }

    return { success: true, message: 'If this number is registered, you will receive an OTP via SMS.' };
  }

  // ============ FORGOT PIN: Step 2 – Verify OTP ============
  async verifyForgotPinOTP(phoneNumber: string, otp: string) {
    const normalized = this.normalizePhone(phoneNumber);
    if (!normalized) {
      return { success: false, message: 'Invalid phone number format' };
    }

    // Find the latest non-used OTP for this number
    const otpRecord = await prisma.pinResetOTP.findFirst({
      where: {
        phoneNumber: normalized,
        used: false,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return { success: false, message: 'No pending OTP found. Please request a new one.' };
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    // Check max attempts
    if (otpRecord.attempts >= MAX_OTP_VERIFY_ATTEMPTS) {
      return { success: false, message: 'Too many wrong attempts. Please request a new OTP.' };
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) {
      await prisma.pinResetOTP.update({
        where: { id: otpRecord.id },
        data: { attempts: otpRecord.attempts + 1 },
      });
      const remaining = MAX_OTP_VERIFY_ATTEMPTS - (otpRecord.attempts + 1);
      return { success: false, message: `Incorrect OTP. ${remaining} attempt(s) remaining.` };
    }

    // OTP is correct – generate session token for PIN reset
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await prisma.pinResetOTP.update({
      where: { id: otpRecord.id },
      data: {
        verified: true,
        sessionToken,
        expiresAt: new Date(Date.now() + PIN_RESET_SESSION_EXPIRY_MS), // extend expiry for PIN entry
      },
    });

    return {
      success: true,
      data: { sessionToken },
      message: 'OTP verified. You may now set a new PIN.',
    };
  }

  // ============ FORGOT PIN: Step 3 – Reset PIN ============
  async resetPinWithToken(sessionToken: string, newPin: string) {
    // Validate new PIN complexity
    const pinValidation = validatePin(newPin);
    if (!pinValidation.isValid) {
      return { success: false, message: pinValidation.message || 'Invalid PIN' };
    }

    const otpRecord = await prisma.pinResetOTP.findUnique({
      where: { sessionToken },
    });

    if (!otpRecord || !otpRecord.verified || otpRecord.used) {
      return { success: false, message: 'Invalid or expired reset session.' };
    }

    if (new Date() > otpRecord.expiresAt) {
      return { success: false, message: 'Reset session has expired. Please start again.' };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { phoneNumber: otpRecord.phoneNumber },
      select: { id: true, fullName: true, phoneNumber: true },
    });
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    // Hash and update PIN
    const hashedPin = await bcrypt.hash(newPin, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          pin: hashedPin,
          mustChangePin: false,
          failedAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.pinResetOTP.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
    ]);

    // Send confirmation SMS
    try {
      await smsService.sendSMS(
        user.phoneNumber,
        `Hi ${user.fullName}, your eStokvel PIN has been successfully reset. If you did not do this, contact support immediately.`
      );
    } catch (smsError) {
      console.warn('Failed to send PIN reset confirmation SMS:', smsError);
    }

    return { success: true, message: 'PIN has been reset successfully. You can now log in with your new PIN.' };
  }

  // ============ ADMIN SELF-REGISTRATION ============
  async adminSelfRegister(data: { phoneNumber: string; firstName: string; lastName: string; idNumber: string }) {
    const normalized = this.normalizePhone(data.phoneNumber);
    if (!normalized) {
      return { success: false, message: 'Phone number must be 10 digits (e.g., 0831234567)' };
    }

    const firstName = data.firstName?.trim();
    const lastName = data.lastName?.trim();
    if (!firstName || firstName.length < 2) {
      return { success: false, message: 'First name must be at least 2 characters' };
    }
    if (!lastName || lastName.length < 1) {
      return { success: false, message: 'Last name is required' };
    }
    const fullName = `${firstName} ${lastName}`;

    // Validate SA ID number
    const idValidation = validateSAId(data.idNumber);
    if (!idValidation.isValid) {
      return { success: false, message: idValidation.message || 'Invalid ID number' };
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { phoneNumber: normalized } });
    if (existing) {
      return { success: false, message: 'An account with this phone number already exists. Please log in instead.' };
    }

    // Hash ID number for secure storage
    const idNumberHash = await bcrypt.hash(data.idNumber, 10);

    // Generate temp PIN and send via SMS
    const tempPin = this.generateTempPin();
    const hashedPin = await bcrypt.hash(tempPin, 10);

    const admin = await prisma.user.create({
      data: {
        phoneNumber: normalized,
        firstName,
        lastName,
        fullName,
        pin: hashedPin,
        role: 'ADMIN',
        mustChangePin: true,
        isVerified: true,
        idNumberHash,
        verificationStatus: 'PENDING_VERIFY',
      },
      select: {
        id: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    // Submit to Smile Identity for verification (async)
    verificationService.submitVerification({
      userId: admin.id,
      firstName,
      lastName,
      idNumber: data.idNumber,
      dateOfBirth: idValidation.dateOfBirth?.toISOString().split('T')[0],
      phoneNumber: normalized,
    }).catch(err => console.warn('Verification submission failed:', err));

    // Send temp PIN via SMS
    try {
      await smsService.sendSMS(
        normalized,
        `Welcome to eStokvel, ${firstName}! You've registered as a Group Admin. Your temporary PIN is: ${tempPin}. Please change it on first login.`
      );
    } catch (smsError) {
      console.warn('Failed to send registration SMS:', smsError);
    }

    return {
      success: true,
      data: { admin, tempPin }, // Expose tempPin for testing only
      message: `Registration successful! A temporary PIN has been sent to ${normalized} via SMS.`,
    };
  }

  // ============ MEMBER: Submit ID Number (first login) ============
  async submitIdNumber(userId: string, idNumber: string) {
    // Validate SA ID
    const idValidation = validateSAId(idNumber);
    if (!idValidation.isValid) {
      return { success: false, message: idValidation.message || 'Invalid ID number' };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true, idNumberHash: true, verificationStatus: true },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.idNumberHash) {
      return { success: false, message: 'ID number has already been submitted.' };
    }

    // Hash and store
    const idNumberHash = await bcrypt.hash(idNumber, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { idNumberHash, verificationStatus: 'PENDING_VERIFY' },
    });

    // Submit to Smile Identity for verification (async)
    verificationService.submitVerification({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      idNumber,
      dateOfBirth: idValidation.dateOfBirth?.toISOString().split('T')[0],
      phoneNumber: user.phoneNumber,
    }).catch(err => console.warn('Verification submission failed:', err));

    return {
      success: true,
      message: 'ID number submitted successfully. Your identity will be verified shortly.',
    };
  }
}
