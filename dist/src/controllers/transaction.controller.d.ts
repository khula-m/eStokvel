import { Request, Response } from 'express';
export declare class TransactionController {
    createTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateTransaction(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getGroupTransactionStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordContribution(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordPayout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordLoan(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    recordLoanRepayment(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getMyTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getDashboardData(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=transaction.controller.d.ts.map