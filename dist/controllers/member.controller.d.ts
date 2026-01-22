import { Request, Response } from 'express';
export declare class MemberController {
    addMember(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMember(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateMember(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    removeMember(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getGroupMembers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMemberStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    joinGroupWithCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMyMemberships(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=member.controller.d.ts.map