import { Dimensions, PixelRatio, Platform } from 'react-native';

/**
 * Responsive font scaling utility for eStokvel.
 *
 * Uses the screen width to compute a scale factor relative to a
 * 375pt (iPhone SE-class) base width, so text sizes adapt to
 * different device sizes while remaining readable.
 *
 * On web the factor is clamped to a narrower range (0.92–1.12)
 * because browser zoom already handles many scaling needs.
 */

const BASE_WIDTH = 375; // design reference width

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const rawScale = SCREEN_WIDTH / BASE_WIDTH;

const SCALE =
  Platform.OS === 'web'
    ? Math.min(Math.max(rawScale, 0.92), 1.12)
    : Math.min(Math.max(rawScale, 0.8), 1.3);

/**
 * Scale a font size relative to screen width.
 * Returns a value rounded to the nearest pixel.
 *
 * @example
 *   fontSize: scaleFontSize(16) // 16 on 375pt device, ~18 on 428pt, etc.
 */
export const scaleFontSize = (size: number): number =>
  Math.round(PixelRatio.roundToNearestPixel(size * SCALE));

/**
 * Moderately scale a value — useful for padding/margins that should
 * grow proportionally but not as aggressively as font sizes.
 *
 * The `factor` param (default 0.5) controls how much of the delta is
 * applied: 0 = no scaling, 1 = full scaling.
 */
export const moderateScale = (size: number, factor = 0.5): number =>
  Math.round(size + (scaleFontSize(size) - size) * factor);
