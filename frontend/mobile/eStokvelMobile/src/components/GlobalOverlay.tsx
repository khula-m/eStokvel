import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Animated, Platform, Modal,
  Dimensions, StyleSheet,
} from 'react-native';
import { Icon, IconName } from './Icon';
import { COLORS } from '../constants/theme';
import { registerAlertHandler, unregisterAlertHandler } from '../utils/alert';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  onDismiss?: () => void;
}

interface ConfirmItem {
  title: string;
  message?: string;
  buttons: Array<{ text: string; onPress?: () => void; style?: string }>;
}

const TOAST_DURATION = 3200;

const TOAST_CONFIG: Record<ToastType, { bg: string; accent: string; icon: IconName }> = {
  success: { bg: '#F0FDF4', accent: '#059669', icon: 'check-circle' },
  error:   { bg: '#FEF2F2', accent: '#DC2626', icon: 'cancel' },
  info:    { bg: '#EFF6FF', accent: '#0A2463', icon: 'info' },
  warning: { bg: '#FFFBEB', accent: '#D97706', icon: 'warning' },
};

// ─────────────────────────────────────────────
// Single Toast (animated)
// ─────────────────────────────────────────────
const SingleToast = ({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(dismiss, TOAST_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      item.onDismiss?.();
      onRemove(item.id);
    });
  }, [item]);

  const cfg = TOAST_CONFIG[item.type];

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity, marginBottom: 8 }}>
      <TouchableOpacity activeOpacity={0.9} onPress={dismiss} style={[toastStyles.container, { backgroundColor: cfg.bg, borderLeftColor: cfg.accent }]}>
        <View style={[toastStyles.iconCircle, { backgroundColor: `${cfg.accent}18` }]}>
          <Icon name={cfg.icon} size={22} color={cfg.accent} />
        </View>
        <View style={toastStyles.textContainer}>
          <Text style={toastStyles.title}>{item.title}</Text>
          {item.message ? <Text style={toastStyles.message} numberOfLines={3} ellipsizeMode="tail">{item.message}</Text> : null}
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// Confirm Dialog
// ─────────────────────────────────────────────
const ConfirmDialog = ({ item, onClose }: { item: ConfirmItem | null; onClose: () => void }) => {
  if (!item) return null;

  const cancelBtn = item.buttons.find(b => b.style === 'cancel') || item.buttons[0];
  const actionBtn = item.buttons.find(b => b.style !== 'cancel') || item.buttons[item.buttons.length - 1];
  const isDestructive = actionBtn?.style === 'destructive';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={confirmStyles.overlay}>
        <View style={confirmStyles.card}>
          {/* Icon */}
          <View style={[confirmStyles.iconWrapper, { backgroundColor: isDestructive ? '#FEF2F2' : '#EFF6FF' }]}>
            <Icon
              name={isDestructive ? 'warning' : 'info'}
              size={28}
              color={isDestructive ? COLORS.error : COLORS.primary}
            />
          </View>

          <Text style={confirmStyles.title}>{item.title}</Text>
          {item.message ? <Text style={confirmStyles.message}>{item.message}</Text> : null}

          <View style={confirmStyles.buttonRow}>
            <TouchableOpacity
              style={confirmStyles.cancelButton}
              onPress={() => { cancelBtn?.onPress?.(); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={confirmStyles.cancelText}>{cancelBtn?.text || 'Cancel'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[confirmStyles.actionButton, { backgroundColor: isDestructive ? COLORS.error : COLORS.primary }]}
              onPress={() => { actionBtn?.onPress?.(); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={confirmStyles.actionText}>{actionBtn?.text || 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// GlobalOverlay – mount once in App.tsx
// ─────────────────────────────────────────────
export const GlobalOverlay = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmItem | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    registerAlertHandler({
      showToast: (item: ToastItem) => setToasts(prev => [...prev, item]),
      showConfirm: (item: ConfirmItem) => setConfirm(item),
    });
    return () => unregisterAlertHandler();
  }, []);

  return (
    <>
      {/* Toast layer */}
      <View style={toastStyles.wrapper} pointerEvents="box-none">
        {toasts.map(t => (
          <SingleToast key={t.id} item={t} onRemove={removeToast} />
        ))}
      </View>

      {/* Confirm dialog */}
      <ConfirmDialog item={confirm} onClose={() => setConfirm(null)} />
    </>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const toastStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 54,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    maxWidth: 480,
    width: '100%',
    backgroundColor: '#fff',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 }),
  } as any,
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 16 }),
  } as any,
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
