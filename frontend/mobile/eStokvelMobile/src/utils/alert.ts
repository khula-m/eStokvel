import { Alert, Platform } from 'react-native';

export const showAlert = (
  title: string,
  message?: string,
  buttons?: Array<{ text: string; onPress?: () => void; style?: string }>
) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length >= 2) {
      const confirmed = window.confirm(`${title}\n\n${message || ''}`);
      if (confirmed) { buttons[buttons.length - 1]?.onPress?.(); }
      else { buttons[0]?.onPress?.(); }
    } else {
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
      buttons?.[0]?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons as any);
  }
};
