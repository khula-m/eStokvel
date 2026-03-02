import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';
import { CreateTransactionInput, UpdateTransactionInput } from '../models/Transaction.model';
import { PaymentMethod, TransactionType } from '../utils/enums';

const transactionService = new TransactionService();

export class TransactionController {
  /**
   * Create a new transaction
   */
  async createTransaction(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const input: CreateTransactionInput = req.body;
      
      // Validate required fields
      if (!input.stokvelGroupId || !input.transactionType || !input.amount || !input.paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'stokvelGroupId, transactionType, amount, and paymentMethod are required'
        });
      }

      // Validate transaction type
      if (!Object.values(TransactionType).includes(input.transactionType as TransactionType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transaction type. Valid types: \${Object.values(TransactionType).join(', ')}`
        });
      }

      // Validate payment method
      if (!Object.values(PaymentMethod).includes(input.paymentMethod as PaymentMethod)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}`
        });
      }

      const result = await transactionService.createTransaction(input, userId);
      
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Create transaction error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Member self-contribution - Members can make their own payments
   */
  async contribute(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { stokvelGroupId, amount, paymentMethod, notes } = req.body;

      if (!stokvelGroupId || !amount) {
        return res.status(400).json({ success: false, message: 'stokvelGroupId and amount are required' });
      }

      if (!paymentMethod) {
        return res.status(400).json({ success: false, message: 'paymentMethod is required (BANK_TRANSFER, MOBILE_MONEY, CARD, EFT, OZOW)' });
      }

      const result = await transactionService.createMemberContribution(
        { stokvelGroupId, amount: parseFloat(amount), paymentMethod, notes },
        userId
      );

      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('Member contribute error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
  }

  /**
   * Get transaction by ID - SECURE: Verifies user has access
   */
  async getTransaction(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Pass userId to verify access
      const result = await transactionService.getTransactionById(id, userId);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        const statusCode = result.message.includes('access') ? 403 : 400;
        return res.status(statusCode).json(result);
      }
    } catch (error: any) {
      console.error('Get transaction error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = (req as any).user?.id;
      const input: UpdateTransactionInput = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const result = await transactionService.updateTransaction(id, input, userId);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Update transaction error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get transactions with filters - SECURE: Only returns transactions from user's groups
   */
  async getTransactions(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const {
        stokvelGroupId,
        memberId,
        transactionType,
        status,
        paymentMethod,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        page = '1',
        limit = '20'
      } = req.query;

      const filters: any = {};
      if (stokvelGroupId) filters.stokvelGroupId = stokvelGroupId as string;
      if (memberId) filters.memberId = memberId as string;
      if (transactionType) filters.transactionType = transactionType as string;
      if (status) filters.status = status as string;
      if (paymentMethod) filters.paymentMethod = paymentMethod as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (minAmount) filters.minAmount = parseFloat(minAmount as string);
      if (maxAmount) filters.maxAmount = parseFloat(maxAmount as string);

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // SECURE: Use getUserTransactions to ensure user only sees their own data
      const result = await transactionService.getUserTransactions(userId, filters, pageNum, limitNum);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Get transactions error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get transaction statistics for a group - SECURE: Verifies membership
   */
  async getGroupTransactionStats(req: Request, res: Response) {
    try {
      const groupId = req.params.groupId as string;
      const userId = (req as any).user?.id;
      const { period } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // SECURITY: Verify user is a member of the group
      const membership = await transactionService.verifyGroupMembership(userId, String(groupId));
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      const result = await transactionService.getGroupTransactionStats(
        String(groupId), 
        period as 'day' | 'week' | 'month' | 'year'
      );
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Get transaction stats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Record a contribution payment
   */
  async recordContribution(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { stokvelGroupId, memberId, amount, paymentMethod, transactionDate, notes } = req.body;

      // Validate required fields
      if (!stokvelGroupId || !memberId || !amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'stokvelGroupId, memberId, amount, and paymentMethod are required'
        });
      }

      // Validate payment method
      if (!Object.values(PaymentMethod).includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}`
        });
      }

      const result = await transactionService.recordContribution({
        stokvelGroupId,
        memberId,
        amount: parseFloat(amount),
        paymentMethod,
        transactionDate: transactionDate ? new Date(transactionDate) : undefined,
        notes
      }, userId);
      
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Record contribution error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Record a payout to a member
   */
  async recordPayout(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { stokvelGroupId, memberId, amount, paymentMethod, transactionDate, notes } = req.body;

      // Validate required fields
      if (!stokvelGroupId || !memberId || !amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'stokvelGroupId, memberId, amount, and paymentMethod are required'
        });
      }

      // Validate payment method
      if (!Object.values(PaymentMethod).includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}`
        });
      }

      const result = await transactionService.recordPayout({
        stokvelGroupId,
        memberId,
        amount: parseFloat(amount),
        paymentMethod,
        transactionDate: transactionDate ? new Date(transactionDate) : undefined,
        notes
      }, userId);
      
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Record payout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get my transactions (transactions for groups I'm a member of) - SECURE
   */
  async getMyTransactions(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const {
        stokvelGroupId,
        transactionType,
        status,
        startDate,
        endDate,
        page = '1',
        limit = '20'
      } = req.query;

      const filters: any = {};
      if (stokvelGroupId) filters.stokvelGroupId = stokvelGroupId as string;
      if (transactionType) filters.transactionType = transactionType as string;
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // Use secure method - personalOnly=true so members always see only their own
      const result = await transactionService.getUserTransactions(userId, filters, pageNum, limitNum, true);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Get my transactions error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get dashboard data for a specific group
   */
  async getDashboardData(req: Request, res: Response) {
    try {
      const groupId = String(req.params.groupId);
      const userId = (req as any).user?.id;

      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: 'Group ID is required',
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const dashboardData = await transactionService.getDashboardData(String(groupId), userId);

      if (dashboardData.success) {
        return res.status(200).json(dashboardData);
      } else {
        return res.status(400).json(dashboardData);
      }
    } catch (error: any) {
      console.error('Get dashboard data error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  }
}



