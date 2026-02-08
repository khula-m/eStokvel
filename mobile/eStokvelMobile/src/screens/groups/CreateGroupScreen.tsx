import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface CreateGroupScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  onBack: () => void;
}

const CONTRIBUTION_FREQUENCIES = [
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Bi-weekly', value: 'BIWEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
];

const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ onNavigate, onBack }) => {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a group name');
      return;
    }
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      Alert.alert('Required', 'Please enter a valid contribution amount');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/groups`,
        {
          name: name.trim(),
          description: description.trim() || undefined,
          contributionAmount: parseFloat(contributionAmount),
          contributionFrequency: frequency,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const group = response.data.data;
        Alert.alert(
          '🎉 Group Created!',
          `Your stokvel "${name}" is ready!\n\nInvite Code: ${group.code || group.inviteCode || 'N/A'}`,
          [
            {
              text: 'Share Invite',
              onPress: () => onNavigate('shareGroup', { group }),
            },
            {
              text: 'Go to Group',
              onPress: () => onNavigate('home'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data.message || 'Failed to create group');
      }
    } catch (error: any) {
      console.error('Create group error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to create group. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Your Stokvel</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
          <Text style={styles.progressText}>Step 1 of 2 - Basic Details</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Group Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Family Savings Club"
              placeholderTextColor={colors.text.disabled}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
            <Text style={styles.hint}>Choose a name your members will recognize</Text>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's the purpose of this stokvel?"
              placeholderTextColor={colors.text.disabled}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          {/* Contribution Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contribution Amount *</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currency}>R</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="500"
                placeholderTextColor={colors.text.disabled}
                value={contributionAmount}
                onChangeText={setContributionAmount}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.hint}>How much should each member contribute?</Text>
          </View>

          {/* Contribution Frequency */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contribution Frequency</Text>
            <View style={styles.frequencyContainer}>
              {CONTRIBUTION_FREQUENCIES.map((freq) => (
                <TouchableOpacity
                  key={freq.value}
                  style={[
                    styles.frequencyOption,
                    frequency === freq.value && styles.frequencySelected,
                  ]}
                  onPress={() => setFrequency(freq.value)}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      frequency === freq.value && styles.frequencyTextSelected,
                    ]}
                  >
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            You'll be the Treasurer of this group. You can add more details like meeting schedule and bank account later.
          </Text>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="add-circle" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Create Group</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currency: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
    paddingHorizontal: spacing.md,
  },
  amountInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  frequencyOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  frequencySelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  frequencyText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  frequencyTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
});

export default CreateGroupScreen;
