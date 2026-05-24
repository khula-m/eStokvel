import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Icon } from './Icon';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';
import { TransactionTypeName, TransactionSourceName } from '../types';

interface TypeMeta {
  icon: string;
  color: string;
  label: string;
  oneLiner: string;
  detail: string;
}

// User-facing explanations for each TransactionType. Kept short and plain —
// these are read by members making sense of their own ledger, not engineers.
const TYPE_META: Record<TransactionTypeName, TypeMeta> = {
  CONTRIBUTION: {
    icon: 'trending-up',
    color: COLORS.success,
    label: 'Contribution',
    oneLiner: "A member's payment into the group fund.",
    detail:
      'Money in. This is what builds the group pot. Counts toward the contributor\'s savings and their place in the payout schedule.',
  },
  PAYOUT: {
    icon: 'trending-down',
    color: COLORS.error,
    label: 'Payout',
    oneLiner: 'Money paid out of the group fund to a member.',
    detail:
      'Money out. In a rotating stokvel this is whoever\'s turn it is to receive the pot. In an end-of-term stokvel it\'s the share-out at the end of the cycle.',
  },
  EXPENSE: {
    icon: 'receipt-long',
    color: COLORS.warning,
    label: 'Expense',
    oneLiner: 'A group-level cost. Reduces the pot.',
    detail:
      'Money out, but not to a member — for example, bank fees on a transfer. Always paired with a note explaining what it covered.',
  },
  ADJUSTMENT: {
    icon: 'edit',
    color: COLORS.textSecondary,
    label: 'Adjustment',
    oneLiner: 'A correction or audit entry.',
    detail:
      'Anything that isn\'t a normal contribution or payout. Examples: a record that a member joined or left the group, or a SuperAdmin manually correcting a mistake. The notes on the row explain why it was recorded.',
  },
};

interface SourceMeta {
  icon: string;
  color: string;
  bg: string;
  label: string;
  detail: string;
}

// Source explanations only fire for the "non-obvious" origins. Member payments,
// gateway webhooks, and admin-recorded receipts don't need a label — the row's
// other fields already say what's going on. SYSTEM and SUPERADMIN_ADJUSTMENT
// are the rows members benefit from seeing flagged, so they're the only ones
// that get a badge.
const SOURCE_META: Partial<Record<TransactionSourceName, SourceMeta>> = {
  SYSTEM: {
    icon: 'settings',
    color: '#475569',
    bg: '#E2E8F0',
    label: 'System',
    detail:
      'This row was filed automatically by the app — for example, a scheduled payout run, or a marker recording that someone joined or left the group. No person typed it in.',
  },
  SUPERADMIN_ADJUSTMENT: {
    icon: 'warning',
    color: COLORS.warning,
    bg: COLORS.warningSoft,
    label: 'Manual correction',
    detail:
      "A SuperAdmin manually filed this row. This usually means an earlier entry was wrong and couldn't be edited (completed transactions are write-once for safety), so a new adjustment row was added to balance the books. The notes explain the reason.",
  },
};

export const sourceBadgeMeta = (source?: TransactionSourceName): SourceMeta | null => {
  if (!source) return null;
  return SOURCE_META[source] || null;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  transactionType: TransactionTypeName | string;
  source?: TransactionSourceName;
  notes?: string;
}

export const TransactionExplanationSheet = ({ visible, onClose, transactionType, source, notes }: Props) => {
  const typeMeta = TYPE_META[transactionType as TransactionTypeName] ?? TYPE_META.ADJUSTMENT;
  const srcMeta = sourceBadgeMeta(source);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Backdrop dismisses the sheet on tap, matching iOS/Android bottom-sheet convention. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => { /* swallow taps on the sheet itself */ }}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: typeMeta.color + '22' }]}>
              <Icon name={typeMeta.icon as any} size={22} color={typeMeta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{typeMeta.label}</Text>
              <Text style={styles.oneLiner}>{typeMeta.oneLiner}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close explanation" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.detail}>{typeMeta.detail}</Text>

          {srcMeta && (
            <View style={[styles.sourceBlock, { backgroundColor: srcMeta.bg, borderLeftColor: srcMeta.color }]}>
              <View style={styles.sourceHeader}>
                <Icon name={srcMeta.icon as any} size={16} color={srcMeta.color} />
                <Text style={[styles.sourceLabel, { color: srcMeta.color }]}>{srcMeta.label}</Text>
              </View>
              <Text style={styles.sourceDetail}>{srcMeta.detail}</Text>
              {notes && (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesHeading}>Note on this entry</Text>
                  <Text style={styles.notesText}>{notes}</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.okBtn} onPress={onClose}>
            <Text style={styles.okBtnText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Small inline chip used on every ledger row. Tapping it opens the sheet.
// Kept here (rather than in LedgerScreen) so any other view that renders a
// transaction list can use the same affordance.
interface ChipProps {
  transactionType: TransactionTypeName | string;
  onPress: () => void;
}
export const TransactionTypeChip = ({ transactionType, onPress }: ChipProps) => {
  const meta = TYPE_META[transactionType as TransactionTypeName] ?? TYPE_META.ADJUSTMENT;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, { backgroundColor: meta.color + '15', borderColor: meta.color + '33' }]}
      accessibilityLabel={`${meta.label} — tap to learn what this means`}
      accessibilityRole="button"
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Text style={[styles.chipText, { color: meta.color }]}>{meta.label}</Text>
      <Icon name="info" size={11} color={meta.color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    ...shadow(-2, 16, 0.12),
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  iconCircle: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: scaleFontSize(18), fontWeight: '800', color: COLORS.text },
  oneLiner: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  detail: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, marginBottom: SPACING.md },

  sourceBlock: {
    borderLeftWidth: 3,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  sourceLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sourceDetail: { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary },
  notesBlock: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  notesHeading: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  notesText: { fontSize: 13, lineHeight: 19, color: COLORS.text },

  okBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  okBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
});
