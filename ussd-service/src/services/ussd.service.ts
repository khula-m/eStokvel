import axios from 'axios';
import { mainMenu, menuHandlers, MenuState } from '../menus/main.menu';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';

interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
}

// Session storage (in production, use Redis)
const sessions: Map<string, MenuState> = new Map();

export class USSDService {
  /**
   * Handle incoming USSD request
   */
  async handleRequest(request: USSDRequest): Promise<string> {
    const { sessionId, phoneNumber, text } = request;
    
    // Parse user input - split by * for multi-level navigation
    const inputs = text.split('*').filter(i => i !== '');
    const currentInput = inputs[inputs.length - 1] || '';
    
    // Get or create session state
    let state = sessions.get(sessionId) || this.createInitialState(phoneNumber);
    
    try {
      // If no input, show main menu
      if (inputs.length === 0) {
        return mainMenu(state);
      }
      
      // Process navigation based on current menu level
      const response = await this.processInput(state, inputs, currentInput);
      
      // Update session
      sessions.set(sessionId, state);
      
      return response;
    } catch (error) {
      console.error('USSD Processing Error:', error);
      return 'END An error occurred. Please try again.';
    }
  }
  
  /**
   * Create initial session state
   */
  private createInitialState(phoneNumber: string): MenuState {
    return {
      phoneNumber: this.normalizePhoneNumber(phoneNumber),
      authenticated: false,
      userId: null,
      token: null,
      currentMenu: 'main',
      selectedGroup: null,
      data: {},
    };
  }
  
  /**
   * Normalize phone number to 0XXXXXXXXX format
   */
  private normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/[^\d]/g, '');
    
    // Remove country code if present
    if (normalized.startsWith('27')) {
      normalized = '0' + normalized.slice(2);
    }
    if (normalized.startsWith('+27')) {
      normalized = '0' + normalized.slice(3);
    }
    
    return normalized;
  }
  
  /**
   * Process user input and return appropriate menu
   */
  private async processInput(state: MenuState, inputs: string[], currentInput: string): Promise<string> {
    // First level - main menu selection
    if (inputs.length === 1) {
      const handler = menuHandlers[currentInput];
      if (handler) {
        return handler(state, this);
      }
      return `CON Invalid option. Please try again.

${mainMenu(state)}`;
    }
    
    // Multi-level navigation
    const firstChoice = inputs[0];
    switch (firstChoice) {
      case '1': // Check Balance
        return this.handleBalanceFlow(state, inputs);
      case '2': // My Transactions
        return this.handleTransactionsFlow(state, inputs);
      case '3': // Payment Status
        return this.handlePaymentStatusFlow(state, inputs);
      case '4': // Group Info
        return this.handleGroupInfoFlow(state, inputs);
      case '5': // Contact Treasurer
        return this.handleContactFlow(state, inputs);
      default:
        return mainMenu(state);
    }
  }
  
  /**
   * Authenticate user with backend
   */
  async authenticate(phoneNumber: string, pin: string): Promise<{ success: boolean; token?: string; userId?: string; message?: string }> {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        phoneNumber,
        password: pin,
      });
      
      if (response.data.success) {
        return {
          success: true,
          token: response.data.data.token,
          userId: response.data.data.user.id,
        };
      }
      return { success: false, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || 'Authentication failed' };
    }
  }
  
  /**
   * Fetch user's groups
   */
  async getUserGroups(token: string): Promise<any[]> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data || [];
    } catch {
      return [];
    }
  }
  
  /**
   * Fetch user's transactions
   */
  async getUserTransactions(token: string, limit: number = 5): Promise<any[]> {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/transactions/my?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.data;
      return Array.isArray(data) ? data : (data?.transactions || []);
    } catch {
      return [];
    }
  }
  
  // Flow handlers for multi-level menus
  
  private async handleBalanceFlow(state: MenuState, inputs: string[]): Promise<string> {
    // Ask for PIN if not authenticated
    if (!state.authenticated && inputs.length === 1) {
      return 'CON Enter your 4-digit PIN:';
    }
    
    // Authenticate
    if (!state.authenticated && inputs.length === 2) {
      const pin = inputs[1];
      const auth = await this.authenticate(state.phoneNumber, pin);
      
      if (!auth.success) {
        return `END Login failed: ${auth.message}`;
      }
      
      state.authenticated = true;
      state.token = auth.token!;
      state.userId = auth.userId!;
      
      // Fetch and display balance
      const groups = await this.getUserGroups(state.token!);
      
      if (groups.length === 0) {
        return 'END You are not a member of any stokvel group.';
      }
      
      let balanceInfo = 'END Your Stokvel Balances:\n\n';
      groups.forEach((group, i) => {
        balanceInfo += `${i + 1}. ${group.name}\n`;
        balanceInfo += `   Balance: R ${group.totalBalance || 0}\n\n`;
      });
      
      return balanceInfo;
    }
    
    return mainMenu(state);
  }
  
  private async handleTransactionsFlow(state: MenuState, inputs: string[]): Promise<string> {
    if (!state.authenticated && inputs.length === 1) {
      return 'CON Enter your 4-digit PIN:';
    }
    
    if (!state.authenticated && inputs.length === 2) {
      const pin = inputs[1];
      const auth = await this.authenticate(state.phoneNumber, pin);
      
      if (!auth.success) {
        return `END Login failed: ${auth.message}`;
      }
      
      state.authenticated = true;
      state.token = auth.token!;
      state.userId = auth.userId!;
      
      const transactions = await this.getUserTransactions(state.token!, 5);
      
      if (transactions.length === 0) {
        return 'END No recent transactions found.';
      }
      
      let txnInfo = 'END Recent Transactions:\n\n';
      transactions.forEach((tx, i) => {
        const date = new Date(tx.transactionDate).toLocaleDateString('en-ZA');
        txnInfo += `${i + 1}. ${tx.transactionType}: R${tx.amount}\n`;
        txnInfo += `   ${date} - ${tx.status}\n\n`;
      });
      
      return txnInfo;
    }
    
    return mainMenu(state);
  }
  
  private async handlePaymentStatusFlow(state: MenuState, inputs: string[]): Promise<string> {
    if (!state.authenticated && inputs.length === 1) {
      return 'CON Enter your 4-digit PIN:';
    }
    
    if (!state.authenticated && inputs.length === 2) {
      const pin = inputs[1];
      const auth = await this.authenticate(state.phoneNumber, pin);
      
      if (!auth.success) {
        return `END Login failed: ${auth.message}`;
      }
      
      state.authenticated = true;
      state.token = auth.token!;
      state.userId = auth.userId!;
      
      const transactions = await this.getUserTransactions(state.token!, 3);
      const pending = transactions.filter(t => t.status === 'PENDING');
      
      if (pending.length === 0) {
        return 'END No pending payments found.\nAll payments are up to date!';
      }
      
      let info = 'END Pending Payments:\n\n';
      pending.forEach((tx, i) => {
        info += `${i + 1}. ${tx.transactionType}: R${tx.amount}\n`;
        info += `   Group: ${tx.group?.name || 'Unknown'}\n\n`;
      });
      
      return info;
    }
    
    return mainMenu(state);
  }
  
  private async handleGroupInfoFlow(state: MenuState, inputs: string[]): Promise<string> {
    if (!state.authenticated && inputs.length === 1) {
      return 'CON Enter your 4-digit PIN:';
    }
    
    if (!state.authenticated && inputs.length === 2) {
      const pin = inputs[1];
      const auth = await this.authenticate(state.phoneNumber, pin);
      
      if (!auth.success) {
        return `END Login failed: ${auth.message}`;
      }
      
      state.authenticated = true;
      state.token = auth.token!;
      
      const groups = await this.getUserGroups(state.token!);
      
      if (groups.length === 0) {
        return 'END You are not in any stokvel group.';
      }
      
      let info = 'END Your Stokvels:\n\n';
      groups.forEach((group, i) => {
        info += `${i + 1}. ${group.name}\n`;
        info += `   Code: ${group.code}\n`;
        info += `   Contribution: R${group.contributionAmount}\n`;
        info += `   Members: ${group.memberCount || group._count?.members || 0}\n\n`;
      });
      
      return info;
    }
    
    return mainMenu(state);
  }
  
  private async handleContactFlow(state: MenuState, inputs: string[]): Promise<string> {
    if (!state.authenticated && inputs.length === 1) {
      return 'CON Enter your 4-digit PIN:';
    }
    
    if (!state.authenticated && inputs.length === 2) {
      const pin = inputs[1];
      const auth = await this.authenticate(state.phoneNumber, pin);
      
      if (!auth.success) {
        return `END Login failed: ${auth.message}`;
      }
      
      state.authenticated = true;
      state.token = auth.token!;
      
      const groups = await this.getUserGroups(state.token!);
      
      if (groups.length === 0) {
        return 'END You are not in any stokvel group.';
      }
      
      let info = 'END Treasurer Contacts:\n\n';
      groups.forEach((group) => {
        const treasurer = group.createdBy?.phoneNumber || 'Contact via app';
        info += `${group.name}:\n`;
        info += `${treasurer}\n\n`;
      });
      
      return info;
    }
    
    return mainMenu(state);
  }
}

export default USSDService;
