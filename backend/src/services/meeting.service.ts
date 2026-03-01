import { prisma } from '../utils/prisma';

export class MeetingService {
  /**
   * Schedule a meeting for a group
   */
  async createMeeting(data: {
    title: string;
    description?: string;
    date: Date;
    location: string;
    groupId: string;
    createdBy: string;
  }) {
    try {
      // Verify the user is an admin of the group
      const membership = await prisma.member.findFirst({
        where: { userId: data.createdBy, stokvelGroupId: data.groupId, role: 'ADMIN' },
      });
      const user = await prisma.user.findUnique({ where: { id: data.createdBy } });

      if (!membership && user?.role !== 'SUPERADMIN') {
        return { success: false, message: 'Only group admins can schedule meetings' };
      }

      const meeting = await prisma.meeting.create({
        data: {
          title: data.title,
          description: data.description,
          date: data.date,
          location: data.location,
          groupId: data.groupId,
          createdBy: data.createdBy,
        },
        include: {
          author: { select: { id: true, fullName: true, role: true } },
          _count: { select: { attendance: true } },
        },
      });

      return { success: true, data: meeting, message: 'Meeting scheduled successfully' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to schedule meeting' };
    }
  }

  /**
   * Get meetings for a group
   */
  async getGroupMeetings(groupId: string, userId: string, upcoming = true) {
    try {
      const now = new Date();
      const whereClause: any = { groupId };
      if (upcoming) {
        whereClause.date = { gte: now };
      }

      const meetings = await prisma.meeting.findMany({
        where: whereClause,
        include: {
          author: { select: { id: true, fullName: true, role: true } },
          attendance: {
            select: { userId: true, status: true, user: { select: { fullName: true } } },
          },
          _count: { select: { attendance: true } },
        },
        orderBy: { date: upcoming ? 'asc' : 'desc' },
      });

      const memberCount = await prisma.member.count({ where: { stokvelGroupId: groupId } });

      const formatted = meetings.map((m) => {
        const userAttendance = m.attendance.find((a) => a.userId === userId);
        const goingCount = m.attendance.filter((a) => a.status === 'GOING').length;
        const maybeCount = m.attendance.filter((a) => a.status === 'MAYBE').length;
        const attendees = m.attendance
          .filter((a) => a.status === 'GOING' || a.status === 'MAYBE')
          .map((a) => ({ name: (a as any).user?.fullName || 'Unknown', status: a.status }));
        return {
          ...m,
          userStatus: userAttendance?.status || null,
          goingCount,
          maybeCount,
          totalMembers: memberCount,
          attendees,
          attendance: undefined, // Don't expose raw attendance
        };
      });

      return { success: true, data: formatted };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to get meetings' };
    }
  }

  /**
   * RSVP to a meeting
   */
  async rsvpMeeting(meetingId: string, userId: string, status: 'GOING' | 'MAYBE' | 'NOT_GOING') {
    try {
      const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
      if (!meeting) return { success: false, message: 'Meeting not found' };

      // Verify user is a member of the group
      const membership = await prisma.member.findFirst({
        where: { userId, stokvelGroupId: meeting.groupId },
      });
      if (!membership) return { success: false, message: 'You are not a member of this group' };

      const attendance = await prisma.meetingAttendance.upsert({
        where: { meetingId_userId: { meetingId, userId } },
        update: { status },
        create: { meetingId, userId, status },
      });

      return { success: true, data: attendance, message: 'RSVP updated' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to RSVP' };
    }
  }

  /**
   * Update a meeting
   */
  async updateMeeting(id: string, userId: string, data: { title?: string; description?: string; date?: Date; location?: string }) {
    try {
      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (!meeting) return { success: false, message: 'Meeting not found' };
      if (meeting.createdBy !== userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== 'SUPERADMIN') {
          return { success: false, message: 'Only the organizer can edit this meeting' };
        }
      }

      const updated = await prisma.meeting.update({
        where: { id },
        data,
        include: { author: { select: { id: true, fullName: true } }, _count: { select: { attendance: true } } },
      });
      return { success: true, data: updated, message: 'Meeting updated' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to update meeting' };
    }
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(id: string, userId: string) {
    try {
      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (!meeting) return { success: false, message: 'Meeting not found' };
      if (meeting.createdBy !== userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.role !== 'SUPERADMIN') {
          return { success: false, message: 'Only the organizer can cancel this meeting' };
        }
      }

      await prisma.meeting.delete({ where: { id } });
      return { success: true, message: 'Meeting cancelled' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to cancel meeting' };
    }
  }
}

export const meetingService = new MeetingService();
