import { Request, Response } from "express";
export declare class AuthController {
    register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCurrentUser(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    verifyPin(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export declare const authController: AuthController;
//# sourceMappingURL=auth.controller.d.ts.map