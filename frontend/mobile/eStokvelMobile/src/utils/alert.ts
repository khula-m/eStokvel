import { Alert, Platform } from 'react-native';

// ─── In-app alert handler (registered by GlobalOverlay) ───
type AlertButton = { text: string; onPress?: () => void; style?: string };

interface ToastData {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onDismiss?: () => void;
}

interface ConfirmData {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertHandler {
  showToast: (data: ToastData) => void;
  showConfirm: (data: ConfirmData) => void;
}

let handler: AlertHandler | null = null;
let idCounter = 0;

export const registerAlertHandler = (h: AlertHandler) => { handler = h; };
export const unregisterAlertHandler = () => { handler = null; };

/**
 * Drop-in replacement for the old browser-based showAlert.
 * When GlobalOverlay is mounted it renders in-app toasts & confirms.
 * Falls back to native Alert on mobile if overlay isn't ready.
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
) => {
  // ── Handler registered → in-app UI ──
  if (handler) {
    if (buttons && buttons.length >= 2) {
      handler.showConfirm({ title, message, buttons });
    } else {
      const type: ToastData['type'] =
        title.toLowerCase().includes('success') ? 'success' :
        title.toLowerCase().includes('error') ? 'error' :
        title.toLowerCase().includes('warning') ? 'warning' : 'info';

      handler.showToast({
        id: `toast_${Date.now()}_${++idCounter}`,
        title,
        message,
        type,
        onDismiss: buttons?.[0]?.onPress,
      });
    }
    return;
  }

  // ── Fallback: native Alert (mobile only) ──
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
  }
};
