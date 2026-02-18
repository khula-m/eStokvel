import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import apiService from '../../services/api';

interface BankDetailsScreenParams {
  groupId: string;
  groupName: string;
  isTreasurer: boolean;
}

type Props = NativeStackScreenProps<any, 'BankDetails'>;

interface BankDetails {
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  branchCode: string | null;
}

export default function BankDetailsScreen({ route, navigation }: Props) {
  const { groupId, groupName, isTreasurer } = route.params as BankDetailsScreenParams;

  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    branchCode: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // South African banks list
  const banks = [
    'ABSA',
    'Capitec Bank',
    'FNB (First National Bank)',
    'Nedbank',
    'Standard Bank',
    'African Bank',
    'Investec',
    'TymeBank',
    'Discovery Bank',
    'Other',
  ];

  useEffect(() => {
    navigation.setOptions({
      title: 'Bank Details',
    });
    fetchBankDetails();
  }, [navigation]);

  const fetchBankDetails = async () => {
    try {
      const response = await apiService.get(`/payments/groups/${groupId}/bank-details`);
      if (response.data.success && response.data.data) {
        setBankDetails({
          bankName: response.data.data.bankName || '',
          accountNumber: response.data.data.accountNumber || '',
          accountHolder: response.data.data.accountHolder || '',
          branchCode: response.data.data.branchCode || '',
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch bank details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountHolder) {
      Alert.alert('Missing Information', 'Please fill in bank name, account number, and account holder.');
      return;
    }

    setSaving(true);
    try {
      const response = await apiService.put(`/payments/groups/${groupId}/bank-details`, {
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountHolder: bankDetails.accountHolder,
        branchCode: bankDetails.branchCode || null,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Bank details updated successfully');
        setIsEditing(false);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update bank details');
      }
    } catch (error: any) {
      console.error('Failed to save bank details:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update bank details');
    } finally {
      setSaving(false);
    }
  };

  const renderBankSelector = () => (
    <View style={styles.bankSelectorContainer}>
      <Text style={styles.label}>Bank Name *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {banks.map((bank) => (
          <TouchableOpacity
            key={bank}
            style={[
              styles.bankOption,
              bankDetails.bankName === bank && styles.bankOptionSelected,
            ]}
            onPress={() => setBankDetails({ ...bankDetails, bankName: bank })}
            disabled={!isEditing}
          >
            <Text
              style={[
                styles.bankOptionText,
                bankDetails.bankName === bank && styles.bankOptionTextSelected,
              ]}
            >
              {bank}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading bank details...</Text>
      </View>
    );
  }

  const hasExistingDetails = bankDetails.bankName && bankDetails.accountNumber;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Group Header */}
        <View style={styles.header}>
          <Ionicons name="business-outline" size={32} color={colors.primary} />
          <Text style={styles.groupName}>{groupName}</Text>
          <Text style={styles.headerSubtext}>
            {isTreasurer ? 'Manage payment details for your group' : 'View group payment details'}
          </Text>
        </View>

        {/* Bank Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Payment Account</Text>
            {isTreasurer && !isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="pencil" size={18} color={colors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bank Selector */}
          {isEditing ? (
            renderBankSelector()
          ) : (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Bank</Text>
              <Text style={styles.value}>{bankDetails.bankName || 'Not set'}</Text>
            </View>
          )}

          {/* Account Holder */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Holder Name *</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={bankDetails.accountHolder || ''}
                onChangeText={(text: string) => setBankDetails({ ...bankDetails, accountHolder: text })}
                placeholder="Enter account holder name"
                placeholderTextColor={colors.text.disabled}
              />
            ) : (
              <Text style={styles.value}>{bankDetails.accountHolder || 'Not set'}</Text>
            )}
          </View>

          {/* Account Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number *</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={bankDetails.accountNumber || ''}
                onChangeText={(text: string) => setBankDetails({ ...bankDetails, accountNumber: text })}
                placeholder="Enter account number"
                placeholderTextColor={colors.text.disabled}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.value}>{bankDetails.accountNumber || 'Not set'}</Text>
            )}
          </View>

          {/* Branch Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Branch Code (Optional)</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={bankDetails.branchCode || ''}
                onChangeText={(text: string) => setBankDetails({ ...bankDetails, branchCode: text })}
                placeholder="Enter branch code"
                placeholderTextColor={colors.text.disabled}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.value}>{bankDetails.branchCode || 'Not set'}</Text>
            )}
          </View>

          {/* Save/Cancel Buttons */}
          {isEditing && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  fetchBankDetails(); // Reset to original values
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Details</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Card */}
        {!hasExistingDetails && isTreasurer && (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color={colors.info} />
            <Text style={styles.infoText}>
              Add your group's bank details so members know where to make their contributions.
            </Text>
          </View>
        )}

        {!isTreasurer && (
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.warning} />
            <Text style={styles.infoText}>
              Only the group treasurer can update bank details. Contact your treasurer if you need changes.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
  },
  groupName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  headerSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  editButtonText: {
    marginLeft: 4,
    color: colors.primary,
    fontWeight: '500',
  },
  bankSelectorContainer: {
    marginBottom: spacing.md,
  },
  bankOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    backgroundColor: colors.background,
  },
  bankOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bankOptionText: {
    color: colors.text.primary,
    fontSize: 14,
  },
  bankOptionTextSelected: {
    color: colors.white,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 16,
    color: colors.text.primary,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontWeight: '500',
    fontSize: 16,
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
