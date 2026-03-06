/**
 * Platform-specific utilities for iOS and Android seamless experience.
 * Handles differences in keyboard behavior, haptics, linking, and status bar.
 */
import { Platform, Linking, Keyboard, StatusBar, Dimensions, PixelRatio } from 'react-native';

// ============================================
// DEVICE INFO
// ============================================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIXEL_RATIO = PixelRatio.get();

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isSmallDevice = SCREEN_WIDTH < 375;
export const isTablet = SCREEN_WIDTH >= 768;

/**
 * Get the status bar height based on platform
 */
export function getStatusBarHeight(): number {
  if (isIOS) return 44; // Safe area default (adjusted by SafeAreaView)
  return StatusBar.currentHeight || 24;
}

// ============================================
// KEYBOARD HANDLING
// ============================================

/**
 * Dismiss keyboard (cross-platform)
 */
export function dismissKeyboard(): void {
  Keyboard.dismiss();
}

/**
 * Get keyboard vertical offset for KeyboardAvoidingView
 * iOS needs a positive offset, Android uses 0 (handled by windowSoftInputMode)
 */
export function getKeyboardOffset(): number {
  return isIOS ? 88 : 0;
}

/**
 * Get KeyboardAvoidingView behavior based on platform
 */
export function getKeyboardBehavior(): 'padding' | 'height' | undefined {
  return isIOS ? 'padding' : 'height';
}

// ============================================
// LINKING & EXTERNAL ACTIONS
// ============================================

/**
 * Open phone dialer with the given number
 */
export async function callPhone(phoneNumber: string): Promise<void> {
  const url = `tel:${phoneNumber}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

/**
 * Open SMS composer with the given number
 */
export async function sendSMS(phoneNumber: string, body?: string): Promise<void> {
  const separator = isIOS ? '&' : '?';
  const url = body
    ? `sms:${phoneNumber}${separator}body=${encodeURIComponent(body)}`
    : `sms:${phoneNumber}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

/**
 * Open email client
 */
export async function sendEmail(
  email: string,
  subject?: string,
  body?: string
): Promise<void> {
  let url = `mailto:${email}`;
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  if (params.length) url += `?${params.join('&')}`;
  
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

/**
 * Open app settings (for permission management)
 */
export function openAppSettings(): void {
  Linking.openSettings();
}

// ============================================
// STYLE HELPERS
// ============================================

/**
 * Platform-specific shadow
 */
export function platformShadow(elevation: number = 4) {
  if (isIOS) {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.1 + elevation * 0.02,
      shadowRadius: elevation,
    };
  }
  return { elevation };
}

/**
 * Normalize font size for consistent cross-platform rendering
 */
export function normalizeFontSize(size: number): number {
  const scale = SCREEN_WIDTH / 375; // iPhone 8 as base
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Safe bottom padding (for devices with home indicators / nav bars)
 */
export function getBottomPadding(): number {
  if (isIOS) return 34; // Adjusted by SafeAreaView, this is a fallback
  return 16;
}

// ============================================
// HAPTICS (optional — requires expo-haptics)
// ============================================

/**
 * Light haptic feedback (try/catch in case expo-haptics not installed)
 */
export async function lightHaptic(): Promise<void> {
  try {
    const Haptics = require('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // expo-haptics not installed, silently skip
  }
}

/**
 * Medium haptic feedback for confirmations
 */
export async function mediumHaptic(): Promise<void> {
  try {
    const Haptics = require('expo-haptics');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // expo-haptics not installed, silently skip
  }
}

/**
 * Success haptic feedback
 */
export async function successHaptic(): Promise<void> {
  try {
    const Haptics = require('expo-haptics');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // expo-haptics not installed, silently skip
  }
}
