import { USSDService } from '../services/ussd.service';

export interface MenuState {
  phoneNumber: string;
  authenticated: boolean;
  userId: string | null;
  token: string | null;
  currentMenu: string;
  selectedGroup: string | null;
  data: Record<string, any>;
}

/**
 * Main USSD Menu
 * Following Africa's Talking USSD format:
 * - CON: Continue session, expect more input
 * - END: End session
 */
export function mainMenu(_state: MenuState): string {
  return `CON Welcome to eStokvel
Your Digital Savings Partner

1. Check Balance
2. My Transactions
3. Payment Status
4. Group Info
5. Contact Admin
6. Forgot PIN
0. Exit`;
}

/**
 * Menu option handlers
 */
export const menuHandlers: Record<string, (state: MenuState, service: USSDService) => string | Promise<string>> = {
  '0': () => 'END Thank you for using eStokvel.\nGoodbye!',
  
  '1': () => 'CON Enter your 5-digit PIN:',
  '2': () => 'CON Enter your 5-digit PIN:',
  '3': () => 'CON Enter your 5-digit PIN:',
  '4': () => 'CON Enter your 5-digit PIN:',
  '5': () => 'CON Enter your 5-digit PIN:',
  '6': () => 'CON Forgot PIN\nAn OTP will be sent to your phone.\n\n1. Send OTP to my number\n0. Back',
};

/**
 * Error menu
 */
export function errorMenu(message: string = 'An error occurred'): string {
  return `END ${message}
Please try again later.`;
}

/**
 * Not found menu
 */
export function notFoundMenu(): string {
  return `END No data found.
Please contact your group admin for assistance.`;
}

export default mainMenu;
