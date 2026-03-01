import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../utils/jwt';
import { validatePin } from '../utils/validation';

// ============ CONSTANTS ============
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SUPERADMIN_TOKEN_EXPIRY = '2h'; // Shorter expiry for superadmin

// ============ INTERFACES ============

interface CreateAdminInput {
  phoneNumber: string;
  fullName: string;
}

interface AddMemberInput {
  phoneNumber: string;
  fullName: string;
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

    if (!data.fullName || data.fullName.trim().length < 2) {
      return { success: false, message: 'Full name must be at least 2 characters' };
    }

    const existing = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existing) {
      return { success: false, message: 'User with this phone number already exists' };
    }

    const tempPin = this.generateTempPin();
    const hashedPin = await bcrypt.hash(tempPin, 10);

    const admin = await prisma.user.create({
      data: {
        phoneNumber,
        fullName: data.fullName.trim(),
        pin: hashedPin,
        role: 'ADMIN',
        mustChangePin: true,
        isVerified: true,
        createdById,
      },
      select: {
        id: true,
        phoneNumber: true,
        fullName: true,
        role: true,
        createdAt: true,
      }
    });

    return {
      success: true,
      data: {
        admin,
        tempPin, // Return to superadmin so they can share with the admin
      },
      message: `Admin "${admin.fullName}" created. Temp PIN: ${tempPin}. Share this with the admin securely.`
    };
  }

  // ============ ADMIN: Add Member to Group ============
  async addMember(data: AddMemberInput, createdById: string) {
    const phoneNumber = this.normalizePhone(data.phoneNumber);
    if (!phoneNumber) {
      return { success: false, message: 'Phone number must be 10 digits (e.g., 0831234567)' };
    }

    if (!data.fullName || data.fullName.trim().length < 2) {
      return { success: false, message: 'Full name must be at least 2 characters' };
    }

    // Verify group exists and is active
    const group = await prisma.stokvelGroup.findUnique({
      where: { id: data.groupId },
      select: { id: true, name: true, isActive: true, adminId: true, contributionAmount: true, durationMonths: true }
    });
    if (!group) {
      return { success: false, message: 'Group not found' };
    }
    if (!group.isActive) {
      return { success: false, message: 'This group is no longer active' };
    }
    // Verify caller is the admin of this group
    if (group.adminId !== createdById) {
      return { success: false, message: 'Only the group admin can add members' };
    }

    const tempPin = this.generateTempPin();
    const hashedPin = await bcrypt.hash(tempPin, 10);

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (user) {
      // User exists — check if already a member of this group
      const existingMember = await prisma.member.findUnique({
        where: { userId_stokvelGroupId: { userId: user.id, stokvelGroupId: group.id } }
      });
      if (existingMember) {
        return { success: false, message: `${user.fullName} is already a member of this group` };
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          phoneNumber,
          fullName: data.fullName.trim(),
          pin: hashedPin,
          role: 'MEMBER',
          mustChangePin: true,
          isVerified: true,
          createdById,
        }
      });
    }

    // Add to group as MEMBER
    const membership = await prisma.member.create({
      data: {
        userId: user.id,
        stokvelGroupId: group.id,
        role: 'MEMBER',
      },
      include: {
        user: { select: { id: true, fullName: true, phoneNumber: true } },
        group: { select: { id: true, name: true, code: true } }
      }
    });

    return {
      success: true,
      data: {
        member: membership,
        tempPin, // Admin shares this with the member
        smsMessage: `You've been added to "${group.name}". Download the app and login with your phone number. Your temp PIN is: ${tempPin}`,
      },
      message: `Member "${data.fullName}" added to "${group.name}". Temp PIN: ${tempPin}`
    };
  }

  // ============ LOGIN (Phone + PIN) — ADMIN & MEMBER ONLY ============
  async login(data: LoginInput) {
    if (!data.pin || data.pin.length < 5) {
      return { success: false, message: 'PIN must be 5 digits' };
    }

    const phoneNumber = this.normalizePhone(data.phoneNumber);
    if (!phoneNumber) {
      return { success: false, message: 'Phone number must be 10 digits (e.g., 0831234567)' };
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneNumber: true,
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

    // Successful login — reset failed attempts and lockout
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date(), failedAttempts: 0, lockedUntil: null }
    });

    const token = this.generateToken(user.id, user.phoneNumber, user.role);

    // Fetch memberships for ADMIN and MEMBER roles
    let memberships: any[] = [];
    memberships = await prisma.member.findMany({
        where: { userId: user.id },
        include: {
          group: {
            select: {
              id: true, name: true, code: true,
              contributionAmount: true, contributionFrequency: true,
              durationMonths: true, startDate: true, endDate: true,
            }
          }
        }
      });

    // For ADMIN, also fetch managed groups
    let managedGroups: any[] = [];
    if (user.role === 'ADMIN') {
      managedGroups = await prisma.stokvelGroup.findMany({
        where: { adminId: user.id },
        select: {
          id: true, name: true, code: true,
          contributionAmount: true, durationMonths: true,
          startDate: true, endDate: true, isActive: true,
          _count: { select: { members: true, transactions: true } }
        }
      });
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          role: user.role,
          mustChangePin: user.mustChangePin,
          email: user.email,
          language: user.language,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          memberships: memberships.map(m => ({
            id: m.id,
            role: m.role,
            groupId: m.stokvelGroupId,
            groupName: m.group.name,
            groupCode: m.group.code,
          })),
          managedGroup: managedGroups.length > 0 ? managedGroups[0] : null,
          managedGroups,
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

    if (admin.role !== 'ADMIN') {
      return { success: false, message: 'User is not an admin' };
    }

    // Delete in order to satisfy FK constraints
    // 1. Delete meeting attendance for this user
    await prisma.meetingAttendance.deleteMany({ where: { userId: adminId } });
    // 2. Delete announcement reads for this user
    await prisma.announcementRead.deleteMany({ where: { userId: adminId } });
    // 3. Delete chat replies by this user
    await prisma.chatReply.deleteMany({ where: { senderId: adminId } });
    // 4. Delete chat messages by this user
    await prisma.chatMessage.deleteMany({ where: { senderId: adminId } });
    // 5. Delete meetings created by this user
    await prisma.meeting.deleteMany({ where: { createdBy: adminId } });
    // 6. Delete announcements created by this user
    await prisma.announcement.deleteMany({ where: { createdBy: adminId } });
    // 7. Delete memberships
    await prisma.member.deleteMany({ where: { userId: adminId } });
    // 8. Nullify createdById on users this admin created
    await prisma.user.updateMany({ where: { createdById: adminId }, data: { createdById: null } });
    // 9. Reassign or remove groups (set adminId to null on groups they manage)
    await prisma.stokvelGroup.updateMany({ where: { adminId: adminId }, data: { adminId: null as any } });
    // 10. Handle groups they created – set createdById to requester
    await prisma.stokvelGroup.updateMany({ where: { createdById: adminId }, data: { createdById: requesterId } });
    // 11. Delete transactions recorded by this admin
    await prisma.transaction.updateMany({ where: { recordedById: adminId }, data: { recordedById: requesterId } });
    // 12. Finally delete the user
    await prisma.user.delete({ where: { id: adminId } });

    return {
      success: true,
      message: `Admin "${admin.fullName}" has been removed from the system`
    };
  }

  // ============ SUPERADMIN LOGIN (Email + Password) ============
  async superadminLogin(data: SuperadminLoginInput, ipAddress?: string) {
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
      }
    });

    if (!user || user.role !== 'SUPERADMIN') {
      return { success: false, message: 'Invalid credentials' };
    }

    // Check lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return {
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
        locked: true,
      };
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

    // Success — reset failed attempts, log IP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        lastLoginIp: ipAddress || null,
        failedAttempts: 0,
        lockedUntil: null,
      }
    });

    // Short-lived JWT for superadmin (2 hours vs 7 days for mobile)
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
        },
        token,
      },
      message: 'Superadmin login successful'
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
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        phoneNumber: true,
        fullName: true,
        createdAt: true,
        lastLogin: true,
        managedGroups: {
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: { select: { members: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      data: { admins, count: admins.length },
      message: `Found ${admins.length} admin(s)`
    };
  }

  // ============ SUPERADMIN: System overview ============
  async getSystemOverview() {
    const [adminCount, groupCount, memberCount, transactionAgg] = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.stokvelGroup.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'MEMBER' } }),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      success: true,
      data: {
        admins: adminCount,
        groups: groupCount,
        members: memberCount,
        totalCollected: Number(transactionAgg._sum.amount || 0),
        totalTransactions: transactionAgg._count,
      },
      message: 'System overview retrieved'
    };
  }
}
