import { Request, Response } from 'express';
import { ozowService } from '../services/ozow.service';

class OzowController {
  /**
   * POST /api/ozow/initiate
   * Member initiates an Ozow payment. Returns redirect URL + payment data.
   */
  async initiatePayment(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { groupId, amount, bankReference } = req.body;

      if (!groupId || !amount) {
        return res.status(400).json({ success: false, message: 'groupId and amount are required' });
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
      }

      const result = await ozowService.initiatePayment({
        groupId,
        userId,
        amount: parsedAmount,
        bankReference,
      });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('Ozow initiatePayment controller error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /api/ozow/notify
   * Ozow webhook — server-to-server notification. NO auth required.
   * Integrity verified via SHA-512 hash.
   */
  async handleNotification(req: Request, res: Response) {
    try {
      console.log('Ozow notification received:', JSON.stringify(req.body));

      const result = await ozowService.handleNotification(req.body);

      // Ozow expects a 200 OK response regardless of processing outcome
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Ozow notification controller error:', error);
      // Still return 200 to Ozow so they don't retry endlessly
      return res.status(200).json({ success: false, message: 'Error processing notification' });
    }
  }

  /**
   * POST /api/ozow/payout-notify
   * Ozow payout webhook — server-to-server.
   */
  async handlePayoutNotification(req: Request, res: Response) {
    try {
      console.log('Ozow payout notification received:', JSON.stringify(req.body));

      const result = await ozowService.handlePayoutNotification(req.body);
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Ozow payout notification error:', error);
      return res.status(200).json({ success: false, message: 'Error processing payout notification' });
    }
  }

  /**
   * GET /api/ozow/success?TransactionReference=xxx
   * User redirect after successful payment.
   */
  async handleSuccess(req: Request, res: Response) {
    try {
      const transactionRef = req.query.TransactionReference as string || req.query.transactionReference as string;
      const result = await ozowService.handleRedirect(transactionRef, 'success');

      // Return JSON that the frontend WebView can intercept
      return res.status(200).json({
        ...result,
        redirect: 'success',
      });
    } catch (error: any) {
      return res.status(200).json({ success: false, redirect: 'success', message: 'Payment may have succeeded. Check your dashboard.' });
    }
  }

  /**
   * GET /api/ozow/error?TransactionReference=xxx
   * User redirect after failed payment.
   */
  async handleError(req: Request, res: Response) {
    try {
      const transactionRef = req.query.TransactionReference as string || req.query.transactionReference as string;
      const result = await ozowService.handleRedirect(transactionRef, 'error');

      return res.status(200).json({
        ...result,
        redirect: 'error',
      });
    } catch (error: any) {
      return res.status(200).json({ success: false, redirect: 'error', message: 'Payment failed.' });
    }
  }

  /**
   * GET /api/ozow/cancel?TransactionReference=xxx
   * User redirect after cancelled payment.
   */
  async handleCancel(req: Request, res: Response) {
    try {
      const transactionRef = req.query.TransactionReference as string || req.query.transactionReference as string;
      const result = await ozowService.handleRedirect(transactionRef, 'cancel');

      return res.status(200).json({
        ...result,
        redirect: 'cancel',
      });
    } catch (error: any) {
      return res.status(200).json({ success: false, redirect: 'cancel', message: 'Payment was cancelled.' });
    }
  }

  /**
   * GET /api/ozow/status/:transactionId
   * Check the payment status (authenticated).
   */
  async checkStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { transactionId } = req.params;
      const result = await ozowService.checkTransactionStatus(transactionId as string);

      return res.status(result.success ? 200 : 404).json(result);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export const ozowController = new OzowController();
