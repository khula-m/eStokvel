/**
 * Ozow Payment WebView
 *
 * Opens a modal with a WebView that loads the Ozow payment page.
 * Detects redirect URLs (success/error/cancel) and notifies the parent.
 *
 * On web: falls back to expo-web-browser (opens in new tab).
 * On native: uses react-native-webview inside a modal.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';

const COLORS = {
  primary: '#0A2463',
  primaryLight: '#1E3A8A',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  background: '#F5F7FA',
  text: '#1A1A2E',
  textLight: '#6B7280',
  border: '#E5E7EB',
};

interface OzowPaymentWebViewProps {
  visible: boolean;
  ozowUrl: string;
  paymentData: Record<string, string>;
  transactionId: string;
  amount: number | string;
  groupName: string;
  onSuccess: (transactionId: string) => void;
  onError: (transactionId: string) => void;
  onCancel: (transactionId: string) => void;
  onClose: () => void;
  apiUrl: string;
}

const OzowPaymentWebView: React.FC<OzowPaymentWebViewProps> = ({
  visible,
  ozowUrl,
  paymentData,
  transactionId,
  amount,
  groupName,
  onSuccess,
  onError,
  onCancel,
  onClose,
  apiUrl,
}) => {
  const [loading, setLoading] = useState(true);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Success/error/cancel URL patterns to detect
  const successUrl = `${apiUrl}/api/ozow/success`;
  const errorUrl = `${apiUrl}/api/ozow/error`;
  const cancelUrl = `${apiUrl}/api/ozow/cancel`;

  // For web platform: use an iframe with auto-submitting form
  const handleWebPayment = useCallback(() => {
    if (Platform.OS === 'web' && visible && paymentData && Object.keys(paymentData).length > 0) {
      // Auto-submit the form after a short delay
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
        setLoading(false);
      }, 500);
    }
  }, [visible, paymentData]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setWebViewLoaded(false);
      handleWebPayment();
    }
  }, [visible, handleWebPayment]);

  // Poll for transaction status changes (since we can't detect iframe navigation cross-origin)
  useEffect(() => {
    if (!visible || !transactionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const token = ''; // We'll pass this as a prop if needed
        const res = await fetch(`${apiUrl}/api/ozow/status/${transactionId}`);
        const data = await res.json();

        if (data.success && data.status) {
          if (data.status === 'COMPLETED') {
            clearInterval(pollInterval);
            onSuccess(transactionId);
          } else if (data.status === 'FAILED') {
            clearInterval(pollInterval);
            onError(transactionId);
          } else if (data.status === 'CANCELLED') {
            clearInterval(pollInterval);
            onCancel(transactionId);
          }
        }
      } catch {
        // Silent — keep polling
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [visible, transactionId, apiUrl, onSuccess, onError, onCancel]);

  if (!visible) return null;

  // ─── Web Platform: iframe approach ────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Icon name="payments" size={22} color={COLORS.primary} />
                <Text style={styles.headerTitle}>Ozow Payment</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Icon name="close" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {/* Payment info bar */}
            <View style={styles.infoBar}>
              <Text style={styles.infoText}>
                Paying <Text style={styles.infoBold}>R {amount}</Text> to{' '}
                <Text style={styles.infoBold}>{groupName}</Text>
              </Text>
            </View>

            {/* Loading indicator */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Connecting to Ozow...</Text>
              </View>
            )}

            {/* Hidden auto-submit form targeting the iframe */}
            <form
              ref={formRef as any}
              method="POST"
              action={ozowUrl}
              target="ozow-iframe"
              style={{ display: 'none' }}
            >
              {Object.entries(paymentData).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
            </form>

            {/* Ozow iframe */}
            <iframe
              ref={iframeRef as any}
              name="ozow-iframe"
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 12,
                display: loading ? 'none' : 'block',
              } as any}
              onLoad={() => {
                setLoading(false);
                setWebViewLoaded(true);
              }}
              sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation"
            />

            {/* Footer with cancel */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { onCancel(transactionId); }}
              >
                <Icon name="cancel" size={16} color={COLORS.error} />
                <Text style={styles.cancelText}>Cancel Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ─── Native Platform: use react-native-webview ────────────────
  // Note: For native, we use a different approach — post form data via injected JS
  let WebView: any = null;
  try {
    WebView = require('react-native-webview').default;
  } catch {
    // WebView not available on this platform
  }

  if (!WebView) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Icon name="error-outline" size={48} color={COLORS.warning} />
            <Text style={[styles.headerTitle, { marginTop: 16 }]}>WebView Not Available</Text>
            <Text style={styles.loadingText}>
              Please install react-native-webview to use Ozow payments on this platform.
            </Text>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Build an HTML form that auto-submits to Ozow
  const formHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body onload="document.forms[0].submit()">
      <div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif">
        <p>Connecting to Ozow...</p>
      </div>
      <form method="POST" action="${ozowUrl}">
        ${Object.entries(paymentData).map(([k, v]) => `<input type="hidden" name="${k}" value="${v}" />`).join('\n')}
      </form>
    </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="payments" size={22} color={COLORS.primary} />
              <Text style={styles.headerTitle}>Ozow Payment</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoBar}>
            <Text style={styles.infoText}>
              Paying <Text style={styles.infoBold}>R {amount}</Text> to{' '}
              <Text style={styles.infoBold}>{groupName}</Text>
            </Text>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Connecting to Ozow...</Text>
            </View>
          )}

          <WebView
            source={{ html: formHtml }}
            style={{ flex: 1, display: loading ? 'none' : 'flex' }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={(navState: any) => {
              const url = navState.url || '';
              if (url.includes('/api/ozow/success')) {
                onSuccess(transactionId);
              } else if (url.includes('/api/ozow/error')) {
                onError(transactionId);
              } else if (url.includes('/api/ozow/cancel')) {
                onCancel(transactionId);
              }
            }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(transactionId)}>
              <Icon name="cancel" size={16} color={COLORS.error} />
              <Text style={styles.cancelText}>Cancel Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  infoBar: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.primary,
    textAlign: 'center',
  },
  infoBold: {
    fontWeight: '700',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textLight,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OzowPaymentWebView;
