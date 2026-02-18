import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { USSDService } from './services/ussd.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ussdService = new USSDService();

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'eStokvel USSD',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Main USSD endpoint - handles Africa's Talking USSD requests
 * 
 * Parameters received from Africa's Talking:
 * - sessionId: Unique session identifier
 * - serviceCode: The USSD code dialed (e.g., *134*911#)
 * - phoneNumber: User's phone number
 * - text: User's input (empty on first request, accumulated inputs separated by *)
 */
app.post('/ussd', async (req: Request, res: Response) => {
  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  console.log('USSD Request:', { sessionId, serviceCode, phoneNumber, text });

  try {
    const response = await ussdService.handleRequest({
      sessionId,
      serviceCode,
      phoneNumber,
      text: text || '',
    });

    // USSD responses start with:
    // CON - Continue (expect more input)
    // END - End session
    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (error) {
    console.error('USSD Error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END An error occurred. Please try again later.');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔵 eStokvel USSD Service running on port ${PORT}`);
  console.log(`📱 Service Code: ${process.env.SERVICE_CODE || '*134*911#'}`);
  console.log(`🔗 Backend API: ${process.env.BACKEND_API_URL || 'http://localhost:5000'}`);
});

export default app;
