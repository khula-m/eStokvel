import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { TransactionService } from '../services/transaction.service';
import logger from '../utils/logger';

const transactionService = new TransactionService();

class PaymentController {
  /**
   * Update bank details for a stokvel group (ADMIN only)
   */
  async updateBankDetails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const groupId = req.params.groupId as string;
      const { bankName, accountNumber, accountHolder, branchCode } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify user is admin of the group
      const membership = await transactionService.verifyGroupMembership(userId, groupId);
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      if (membership.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only group admins can update bank details'
        });
      }

      // Validate required fields
      if (!bankName || !accountNumber || !accountHolder) {
        return res.status(400).json({
          success: false,
          message: 'Bank name, account number and account holder are required'
        });
      }

      // Update bank details
      const updatedGroup = await prisma.stokvelGroup.update({
        where: { id: groupId },
        data: {
          bankName,
          accountNumber,
          accountHolder,
          branchCode: branchCode || null
        },
        select: {
          id: true,
          name: true,
          bankName: true,
          accountNumber: true,
          accountHolder: true,
          branchCode: true
        }
      });

      return res.status(200).json({
        success: true,
        data: updatedGroup,
        message: 'Bank details updated successfully'
      });
    } catch (error: any) {
      logger.error('Update bank details error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update bank details'
      });
    }
  }

  /**
   * Get bank details for a stokvel group (all members can view)
   */
  async getBankDetails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const groupId = req.params.groupId as string;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify user is a member of the group
      const membership = await transactionService.verifyGroupMembership(userId, groupId);
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      const group = await prisma.stokvelGroup.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          name: true,
          bankName: true,
          accountNumber: true,
          accountHolder: true,
          branchCode: true
        }
      });

      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }

      // Mask account number for non-admins (show last 4 digits only)
      const maskedData = {
        ...group,
        accountNumber: membership.role === 'ADMIN' 
          ? group.accountNumber 
          : group.accountNumber 
            ? `****${group.accountNumber.slice(-4)}`
            : null
      };

      return res.status(200).json({
        success: true,
        data: maskedData
      });
    } catch (error: any) {
      logger.error('Get bank details error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get bank details'
      });
    }
  }

  /**
   * Upload payment proof for a transaction
   */
  async uploadPaymentProof(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const transactionId = req.params.transactionId as string;
      const file = req.file;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Get the transaction
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          member: true
        }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Verify user is related to this transaction (member or admin)
      const membership = await transactionService.verifyGroupMembership(userId, transaction.stokvelGroupId);
      if (!membership.isMember) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to upload proof for this transaction'
        });
      }

      // Determine the file URL (in production, this would be a cloud storage URL)
      const receiptUrl = `/uploads/${file.filename}`;

      // Update transaction with receipt URL
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          receiptUrl,
          status: 'PENDING' // Keep as pending until admin verifies
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          transactionId: updatedTransaction.id,
          receiptUrl: updatedTransaction.receiptUrl,
          status: updatedTransaction.status
        },
        message: 'Payment proof uploaded successfully'
      });
    } catch (error: any) {
      logger.error('Upload payment proof error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload payment proof'
      });
    }
  }

  /**
   * Verify a payment (ADMIN only)
   */
  async verifyPayment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const transactionId = req.params.transactionId as string;
      const { status, notes } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Valid statuses for verification
      const validStatuses = ['COMPLETED', 'FAILED', 'PENDING'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be COMPLETED, FAILED, or PENDING'
        });
      }

      // Get the transaction
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      // Verify user is admin of the group
      const membership = await transactionService.verifyGroupMembership(userId, transaction.stokvelGroupId);
      if (!membership.isMember || membership.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only group admins can verify payments'
        });
      }

      // Update transaction status
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status,
          notes: notes || transaction.notes
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true
                }
              }
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: updatedTransaction,
        message: `Payment ${status === 'COMPLETED' ? 'verified' : 'updated'} successfully`
      });
    } catch (error: any) {
      logger.error('Verify payment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify payment'
      });
    }
  }

  /**
   * Get pending payments for verification (ADMIN only)
   */
  async getPendingPayments(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const groupId = req.params.groupId as string;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Verify user is admin of the group
      const membership = await transactionService.verifyGroupMembership(userId, groupId);
      if (!membership.isMember || membership.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Only group admins can view pending payments'
        });
      }

      const pendingPayments = await prisma.transaction.findMany({
        where: {
          stokvelGroupId: groupId,
          status: 'PENDING',
          receiptUrl: { not: null } // Only those with proof uploaded
        },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phoneNumber: true
                }
              }
            }
          }
        },
        orderBy: {
          transactionDate: 'desc'
        }
      });

      return res.status(200).json({
        success: true,
        data: pendingPayments,
        count: pendingPayments.length
      });
    } catch (error: any) {
      logger.error('Get pending payments error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get pending payments'
      });
    }
  }
}

export const paymentController = new PaymentController();
