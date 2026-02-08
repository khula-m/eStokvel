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

interface JoinGroupScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  onBack: () => void;
}

interface GroupPreview {
  id: string;
  name: string;
  description?: string;
  contributionAmount: number;
  contributionFrequency: string;
  memberCount: number;
  createdAt: string;
  treasurer?: {
    fullName: string;
  };
}

const JoinGroupScreen: React.FC<JoinGroupScreenProps> = ({ onNavigate, onBack }) => {
  const { token } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [groupPreview, setGroupPreview] = useState<GroupPreview | null>(null);

  const formatCode = (text: string) => {
    // Remove spaces and convert to uppercase
    return text.replace(/\s/g, '').toUpperCase();
  };

  const handleCodeChange = (text: string) => {
    const formatted = formatCode(text);
    setCode(formatted);
    // Reset preview when code changes
    if (groupPreview) {
      setGroupPreview(null);
    }
  };

  const handleLookup = async () => {
    if (code.length < 4) {
      Alert.alert('Invalid Code', 'Please enter a valid invite code');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/groups/code/${code}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        // Map backend response to frontend interface
        setGroupPreview({
          id: data.id,
          name: data.name,
          description: data.description,
          contributionAmount: data.contributionAmount || 0,
          contributionFrequency: data.contributionFrequency || 'MONTHLY',
          memberCount: data._count?.members || data.members?.length || 0,
          createdAt: data.createdAt,
          treasurer: data.createdBy ? { fullName: data.createdBy.fullName } : undefined,
        });
      } else {
        Alert.alert('Not Found', 'No group found with this code. Please check and try again.');
      }
    } catch (error: any) {
      console.error('Lookup error:', error);
      if (error.response?.status === 404) {
        Alert.alert('Not Found', 'No group found with this code. Please check with your treasurer.');
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to find group');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!groupPreview) return;

    setJoining(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/groups/${groupPreview.id}/join`,
        { code },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        Alert.alert(
          '🎉 Welcome!',
          `You've joined ${groupPreview.name}!`,
          [
            {
              text: 'Go to Group',
              onPress: () => onNavigate('home'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data.message || 'Failed to join group');
      }
    } catch (error: any) {
      console.error('Join error:', error);
      const message = error.response?.data?.message || 'Failed to join group';
      if (message.includes('already a member')) {
        Alert.alert('Already a Member', 'You are already a member of this group!', [
          { text: 'Go to Group', onPress: () => onNavigate('home') },
        ]);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setJoining(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`;
  };

  const formatFrequency = (freq: string) => {
    switch (freq) {
      case 'WEEKLY': return 'Weekly';
      case 'BIWEEKLY': return 'Bi-weekly';
      case 'MONTHLY': return 'Monthly';
      default: return freq;
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
          <Text style={styles.headerTitle}>Join a Stokvel</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <MaterialIcons name="vpn-key" size={40} color={colors.primary} />
          <Text style={styles.instructionsTitle}>Enter Invite Code</Text>
          <Text style={styles.instructionsText}>
            Ask your treasurer for the group's invite code or click the WhatsApp invite link they shared
          </Text>
        </View>

        {/* Code Input */}
        <View style={styles.codeInputContainer}>
          <Text style={styles.label}>Invite Code</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="Enter code (e.g., ABC123)"
            placeholderTextColor={colors.text.disabled}
            value={code}
            onChangeText={handleCodeChange}
            autoCapitalize="characters"
            maxLength={10}
          />
          
          <TouchableOpacity
            style={[styles.lookupButton, loading && styles.buttonDisabled]}
            onPress={handleLookup}
            disabled={loading || code.length < 4}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="search" size={20} color="#fff" />
                <Text style={styles.lookupButtonText}>Find Group</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Group Preview */}
        {groupPreview && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <MaterialIcons name="groups" size={32} color={colors.primary} />
              <Text style={styles.previewTitle}>{groupPreview.name}</Text>
            </View>

            {groupPreview.description && (
              <Text style={styles.previewDescription}>{groupPreview.description}</Text>
            )}

            <View style={styles.previewDetails}>
              <View style={styles.detailRow}>
                <MaterialIcons name="person" size={18} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Treasurer:</Text>
                <Text style={styles.detailValue}>
                  {groupPreview.treasurer?.fullName || 'N/A'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="payments" size={18} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Contribution:</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(groupPreview.contributionAmount)} {formatFrequency(groupPreview.contributionFrequency)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <MaterialIcons name="group" size={18} color={colors.text.secondary} />
                <Text style={styles.detailLabel}>Members:</Text>
                <Text style={styles.detailValue}>{groupPreview.memberCount || 1}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.joinButton, joining && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={24} color="#fff" />
                  <Text style={styles.joinButtonText}>Join This Group</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.askButton}>
              <MaterialIcons name="chat" size={18} color={colors.primary} />
              <Text style={styles.askButtonText}>Ask a question first</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Help text */}
        <View style={styles.helpCard}>
          <MaterialIcons name="help-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.helpText}>
            Don't have a code? Ask the group treasurer to share an invite link with you via WhatsApp.
          </Text>
        </View>
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
    marginBottom: spacing.xl,
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
  instructionsCard: {
    backgroundColor: colors.primary + '10',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  instructionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  instructionsText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  codeInputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  codeInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: spacing.md,
  },
  lookupButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  lookupButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.success,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  previewTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.md,
    flex: 1,
  },
  previewDescription: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  previewDetails: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    width: 90,
  },
  detailValue: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  joinButton: {
    flexDirection: 'row',
    backgroundColor: colors.success,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  askButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  helpText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default JoinGroupScreen;
