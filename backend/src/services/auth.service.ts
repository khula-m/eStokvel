import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../utils/jwt';
import { validatePin } from '../utils/validation';
import { cacheGetOrSet } from '../utils/redis';
import smsService from './sms.service';

// ============ CONSTANTS ============
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SUPERADMIN_TOKEN_EXPIRY = '2h'; // Shorter expiry for superadmin

// ============ INTERFACES ============

interface CreateAdminInput {
  phoneNumber: string;
  fullName: string;
  groupId?: string; // Optional: immediately assign as admin of a group
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
      // User exists � if a groupId is specified, assign them as admin of that group
      if (data.groupId) {
        const existingMember = await prisma.member.findUnique({
          where: { userId_stokvelGroupId: { userId: existing.id, stokvelGroupId: data.groupId } }
        });
        if (existingMember) {
          // Already a member � promote to ADMIN
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
        // Not a member yet � add as ADMIN
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

    // Create user as ADMIN (global role) so they get the admin dashboard on mobile
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

    // If groupId specified, immediately add as ADMIN of that group
    if (data.groupId) {
      await prisma.member.create({
        data: { userId: admin.id, stokvelGroupId: data.groupId, role: 'ADMIN' }
      });
    }

    // Send SMS with login details to the new admin
    try {
      await smsService.sendSMS(
        phoneNumber,
        `Welcome to eStokvel, ${admin.fullName}! You have been registered as an Admin. Your login PIN is: ${tempPin}. Please change it on first login. Download the app to get started.`
      );
    } catch (smsError) {
      // Log but don't fail the admin creation if SMS fails
      console.warn('Failed to send SMS to new admin:', smsError);
    }

    return {
      success: true,
      data: {
        admin,
        tempPin, // Return to superadmin so they can share with the admin
      },
      message: `Admin "${admin.fullName}" created. Temp PIN: ${tempPin}. An SMS has been sent to ${phoneNumber}.`
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
      select: { id: true, name: true, isActive: true, contributionAmount: true, durationMonths: true }
    });
    if (!group) {
      return { success: false, message: 'Group not found' };
    }
    if (!group.isActive) {
      return { success: false, message: 'This group is no longer active' };
    }
    // Verify caller is an admin of this group (per-group role check)
    const callerMembership = await prisma.member.findFirst({
      where: { userId: createdById, stokvelGroupId: data.groupId, role: 'ADMIN' }
    });
    if (!callerMembership) {
      return { success: false, message: 'Only the group admin can add members' };
    }

    const tempPin = this.generateTempPin();
    const hashedPin = await bcrypt.hash(tempPin, 10);

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (user) {
      // User exists � check if already a member of this group
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

    // Send SMS with login details to the new member
    try {
      await smsService.sendSMS(
        phoneNumber,
        `Welcome to eStokvel! You've been added to "${group.name}". Login with your phone number. Your temp PIN is: ${tempPin}. Please change it on first login.`
      );
    } catch (smsError) {
      console.warn('Failed to send SMS to new member:', smsError);
    }

    return {
      success: true,
      data: {
        member: membership,
        tempPin, // Admin shares this with the member
        smsMessage: `You've been added to \"${group.name}\". Download the app and login with your phone number. Your temp PIN is: ${tempPin}`,
      },
      message: `Member \"${data.fullName}\" added to \"${group.name}\". Temp PIN: ${tempPin}. An SMS has been sent to ${phoneNumber}.`
    };
  }

  // ============ LOGIN (Phone + PIN) � ADMIN & MEMBER ONLY ============
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

    // Derive if the user is an admin of any group (for backward compatibility)
    const adminMemberships = memberships.filter((m: any) => m.role === 'ADMIN');
    const isGroupAdmin = adminMemberships.length > 0;
    // effectiveRole: use global role ADMIN if set, or derive from per-group memberships
    const effectiveRole = user.role === 'ADMIN' || isGroupAdmin ? 'ADMIN' : 'MEMBER';

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          role: user.role,
          // Effective role: ADMIN if global role is ADMIN or admin of any group
          effectiveRole,
          mustChangePin: user.mustChangePin,
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

    // Success � reset failed attempts, log IP
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
    // 1. Users who are ADMIN of at least one group
    const adminMembers = await prisma.member.findMany({
      where: { role: 'ADMIN' },
      include: {
        user: {
          select: {
            id: true,
            phoneNumber: true,
            fullName: true,
            role: true,
            createdAt: true,
            lastLogin: true,
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

    // 2. Also include SUPERADMIN users and users created by superadmin (not yet assigned to a group)
    const superAndCreated = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'SUPERADMIN' },
          { createdById: { not: null } },
        ]
      },
      select: {
        id: true,
        phoneNumber: true,
        fullName: true,
        role: true,
        createdAt: true,
        lastLogin: true,
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

  // ============ SUPERADMIN: System overview ============
  async getSystemOverview() {
    return cacheGetOrSet('system:overview', 60, async () => {
      const [adminMemberCount, groupCount, totalUserCount, transactionAgg] = await Promise.all([
        // Count distinct users who are admin of at least one group
        prisma.member.groupBy({ by: ['userId'], where: { role: 'ADMIN' } }).then((r: any[]) => r.length),
        prisma.stokvelGroup.count({ where: { isActive: true } }),
        prisma.user.count({ where: { role: { in: ['MEMBER', 'ADMIN'] } } }), // All non-superadmin users
        prisma.transaction.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      return {
        success: true,
        data: {
          admins: adminMemberCount,
          groups: groupCount,
          members: totalUserCount,
          totalCollected: Number(transactionAgg._sum.amount || 0),
          totalTransactions: transactionAgg._count,
        },
        message: 'System overview retrieved'
      };
    });
  }
}
