import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface RecordTransactionScreenProps {
  token: string;
  groupId: string;
  groupName: string;
  onBack: () => void;
  onSuccess?: () => void;
}

interface Member {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  role: string;
}

const TRANSACTION_TYPES = [
  { label: 'Contribution', value: 'CONTRIBUTION', icon: 'savings', color: colors.success },
  { label: 'Payout', value: 'PAYOUT', icon: 'payments', color: colors.primary },
  { label: 'Fine', value: 'FINE_PAYMENT', icon: 'gavel', color: colors.warning },
];

const PAYMENT_METHODS = [
  { label: 'Cash', value: 'CASH', icon: 'money' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', icon: 'account-balance' },
  { label: 'Mobile Money', value: 'MOBILE_MONEY', icon: 'phone-android' },
];

const RecordTransactionScreen: React.FC<RecordTransactionScreenProps> = ({
  token,
  groupId,
  groupName,
  onBack,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  
  // Form state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [transactionType, setTransactionType] = useState('CONTRIBUTION');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/groups/${groupId}/members`, { headers });
      setMembers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMember) {
      Alert.alert('Required', 'Please select a member');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Required', 'Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/api/transactions`,
        {
          stokvelGroupId: groupId,
          memberId: selectedMember.id,
          transactionType,
          amount: parseFloat(amount),
          paymentMethod,
          notes: notes || undefined,
          transactionDate: new Date().toISOString(),
        },
        { headers }
      );

      Alert.alert(
        '✅ Transaction Recorded',
        `R ${parseFloat(amount).toFixed(2)} ${transactionType.toLowerCase()} recorded for ${selectedMember.user.fullName}`,
        [{ text: 'OK', onPress: () => { onSuccess?.(); onBack(); } }]
      );
    } catch (error: any) {
      console.error('Transaction error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Record Transaction</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.groupBadge}>
        <MaterialIcons name="group" size={16} color={colors.primary} />
        <Text style={styles.groupBadgeText}>{groupName}</Text>
      </View>

      {/* Member Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Member *</Text>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowMemberPicker(true)}
        >
          {selectedMember ? (
            <View style={styles.selectedMember}>
              <MaterialIcons name="person" size={20} color={colors.primary} />
              <Text style={styles.selectedMemberText}>{selectedMember.user.fullName}</Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>Select a member</Text>
          )}
          <MaterialIcons name="arrow-drop-down" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Transaction Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Transaction Type</Text>
        <View style={styles.typeGrid}>
          {TRANSACTION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.typeOption,
                transactionType === type.value && { borderColor: type.color, backgroundColor: type.color + '15' },
              ]}
              onPress={() => setTransactionType(type.value)}
            >
              <MaterialIcons
                name={type.icon as any}
                size={24}
                color={transactionType === type.value ? type.color : colors.text.secondary}
              />
              <Text
                style={[
                  styles.typeLabel,
                  transactionType === type.value && { color: type.color },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Amount */}
      <View style={styles.section}>
        <Text style={styles.label}>Amount *</Text>
        <View style={styles.amountInput}>
          <Text style={styles.currency}>R</Text>
          <TextInput
            style={styles.amountField}
            placeholder="0.00"
            placeholderTextColor={colors.text.disabled}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.methodOption,
                paymentMethod === method.value && styles.methodSelected,
              ]}
              onPress={() => setPaymentMethod(method.value)}
            >
              <MaterialIcons
                name={method.icon as any}
                size={20}
                color={paymentMethod === method.value ? colors.primary : colors.text.secondary}
              />
              <Text
                style={[
                  styles.methodLabel,
                  paymentMethod === method.value && styles.methodLabelSelected,
                ]}
              >
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any notes about this transaction"
          placeholderTextColor={colors.text.disabled}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons name="check" size={24} color="#fff" />
            <Text style={styles.submitButtonText}>Record Transaction</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Member Picker Modal */}
      <Modal visible={showMemberPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Member</Text>
              <TouchableOpacity onPress={() => setShowMemberPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.memberItem}
                  onPress={() => {
                    setSelectedMember(member);
                    setShowMemberPicker(false);
                  }}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {member.user.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.user.fullName}</Text>
                    <Text style={styles.memberPhone}>{member.user.phoneNumber}</Text>
                  </View>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </TouchableOpacity>
              ))}
              {members.length === 0 && (
                <Text style={styles.emptyText}>No members in this group yet</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.primary + '15',
  },
  groupBadgeText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  section: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedMember: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedMemberText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  placeholder: {
    color: colors.text.disabled,
    fontSize: fontSize.md,
  },
  typeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    paddingHorizontal: spacing.md,
  },
  amountField: {
    flex: 1,
    fontSize: 24,
    padding: spacing.md,
    color: colors.text.primary,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  methodLabel: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  methodLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fontSize.md,
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  memberPhone: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  memberRole: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  emptyText: {
    textAlign: 'center',
    padding: spacing.xl,
    color: colors.text.secondary,
  },
});

export default RecordTransactionScreen;
