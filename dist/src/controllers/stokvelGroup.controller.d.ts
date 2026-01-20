import { Request, Response } from 'express';
export declare class StokvelGroupController {
    createGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getGroupByCode(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getUserGroups(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getGroupStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    joinGroup(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=stokvelGroup.controller.d.ts.map