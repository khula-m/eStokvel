import { Platform } from 'react-native';

/**
 * Cross-platform shadow helper.
 * Returns web-compatible boxShadow or native shadow props + elevation.
 */
export const shadow = (offsetY: number, blur: number, opacity: number): any =>
  Platform.OS === 'web'
    ? { boxShadow: `0 ${offsetY}px ${blur}px rgba(0,0,0,${opacity})` }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: blur / 2,
        elevation: Math.round(blur / 2),
      };
