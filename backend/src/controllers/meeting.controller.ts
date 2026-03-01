import { Request, Response } from 'express';
import { meetingService } from '../services/meeting.service';

export class MeetingController {
  async create(req: Request, res: Response) {
    const { title, description, date, location, groupId } = req.body;
    if (!title || !date || !location || !groupId) {
      return res.status(400).json({ success: false, message: 'Title, date, location, and groupId are required' });
    }
    const result = await meetingService.createMeeting({
      title, description, date: new Date(date), location, groupId,
      createdBy: (req as any).user.id,
    });
    return res.status(result.success ? 201 : 400).json(result);
  }

  async getByGroup(req: Request, res: Response) {
    const groupId = req.params.groupId as string;
    const upcoming = req.query.upcoming !== 'false';
    const result = await meetingService.getGroupMeetings(groupId, (req as any).user.id, upcoming);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async rsvp(req: Request, res: Response) {
    const id = req.params.id as string;
    const { status } = req.body;
    if (!status || !['GOING', 'MAYBE', 'NOT_GOING'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be GOING, MAYBE, or NOT_GOING' });
    }
    const result = await meetingService.rsvpMeeting(id, (req as any).user.id, status);
    return res.status(result.success ? 200 : 400).json(result);
  }

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { title, description, date, location } = req.body;
    const result = await meetingService.updateMeeting(id, (req as any).user.id, {
      title, description, date: date ? new Date(date) : undefined, location,
    });
    return res.status(result.success ? 200 : 400).json(result);
  }

  async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await meetingService.deleteMeeting(id, (req as any).user.id);
    return res.status(result.success ? 200 : 400).json(result);
  }
}

export const meetingController = new MeetingController();
