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
          message: \`Invalid transaction type. Valid types: \${Object.values(TransactionType).join(', ')}\`
        });
      }

      // Validate payment method
      if (!Object.values(PaymentMethod).includes(input.paymentMethod as PaymentMethod)) {
        return res.status(400).json({
          success: false,
          message: \`Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}\`
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
   * Get transaction by ID
   */
  async getTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await transactionService.getTransactionById(id);
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(404).json(result);
      }
      
    } catch (error: any) {
      console.error('Get transaction error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const input: UpdateTransactionInput = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
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
   * Get transactions with filters
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

      const result = await transactionService.getTransactions(filters, pageNum, limitNum);
      
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
   * Get transaction statistics for a group
   */
  async getGroupTransactionStats(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = (req as any).user?.id;
      const { period } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user is a member of the group
      // (In a real app, implement this check)

      const result = await transactionService.getGroupTransactionStats(
        groupId, 
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
          message: \`Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}\`
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
          message: \`Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}\`
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
   * Record a loan disbursement
   */
  async recordLoan(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { stokvelGroupId, memberId, amount, interestRate, dueDate, notes } = req.body;

      // Validate required fields
      if (!stokvelGroupId || !memberId || !amount || !dueDate) {
        return res.status(400).json({
          success: false,
          message: 'stokvelGroupId, memberId, amount, and dueDate are required'
        });
      }

      const result = await transactionService.recordLoan({
        stokvelGroupId,
        memberId,
        amount: parseFloat(amount),
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
        dueDate: new Date(dueDate),
        notes
      }, userId);
      
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Record loan error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Record a loan repayment
   */
  async recordLoanRepayment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { transactionId, amount, paymentMethod, notes } = req.body;

      // Validate required fields
      if (!transactionId || !amount || !paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'transactionId, amount, and paymentMethod are required'
        });
      }

      // Validate payment method
      if (!Object.values(PaymentMethod).includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: \`Invalid payment method. Valid methods: \${Object.values(PaymentMethod).join(', ')}\`
        });
      }

      const result = await transactionService.recordLoanRepayment({
        transactionId,
        amount: parseFloat(amount),
        paymentMethod,
        notes
      }, userId);
      
      if (result.success) {
        return res.status(201).json(result);
      } else {
        return res.status(400).json(result);
      }
      
    } catch (error: any) {
      console.error('Record loan repayment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get my transactions (transactions for groups I'm a member of)
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
        transactionType,
        status,
        startDate,
        endDate,
        page = '1',
        limit = '20'
      } = req.query;

      // Get all groups where user is a member
      // (In a real app, you'd query the database for this)
      // For now, we'll use a simplified approach
      
      const filters: any = {};
      if (transactionType) filters.transactionType = transactionType as string;
      if (status) filters.status = status as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      // Note: In a real implementation, you would filter by groups where user is a member
      // For now, we'll return all transactions
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const result = await transactionService.getTransactions(filters, pageNum, limitNum);
      
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
}
