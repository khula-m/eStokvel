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
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

interface AddMemberScreenProps {
  token?: string;
  groupId?: string;
  groupCode: string;
  groupName: string;
  onBack: () => void;
}

const AddMemberScreen: React.FC<AddMemberScreenProps> = ({ groupCode, groupName, onBack }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sending, setSending] = useState(false);

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join our stokvel "${groupName}" on eStokvel app!\n\nUse invite code: ${groupCode}\n\nDownload the app and enter the code to join.`,
        title: 'Join eStokvel Group',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleSendInvite = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setSending(true);
    // In a real app, this would send an SMS invitation
    setTimeout(() => {
      setSending(false);
      Alert.alert(
        'Invite Sent!',
        `An invitation has been sent to ${phoneNumber}. They can join using code: ${groupCode}`,
        [{ text: 'OK', onPress: () => setPhoneNumber('') }]
      );
    }, 1000);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Members</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Invite Code Section */}
      <View style={styles.codeSection}>
        <MaterialIcons name="vpn-key" size={48} color={colors.primary} />
        <Text style={styles.codeLabel}>Your Group Invite Code</Text>
        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{groupCode}</Text>
        </View>
        <Text style={styles.codeHint}>Share this code with people you want to invite</Text>
        
        <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
          <MaterialIcons name="share" size={20} color="#fff" />
          <Text style={styles.shareButtonText}>Share Invite Code</Text>
        </TouchableOpacity>
      </View>

      {/* Send Invite Section */}
      <View style={styles.inviteSection}>
        <Text style={styles.sectionTitle}>Send Direct Invite</Text>
        <Text style={styles.sectionSubtitle}>
          Enter a phone number to send an SMS invite
        </Text>
        
        <View style={styles.inputRow}>
          <TextInput
            style={styles.phoneInput}
            placeholder="e.g., 0831234567"
            placeholderTextColor={colors.text.disabled}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.buttonDisabled]}
            onPress={handleSendInvite}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsSection}>
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.stepText}>Share the invite code with your friend</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.stepText}>They download eStokvel app and register</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.stepText}>They enter the code to join your group</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  codeSection: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  codeLabel: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  codeBox: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 4,
  },
  codeHint: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  inviteSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.success,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  instructionsSection: {
    padding: spacing.lg,
    margin: spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: fontSize.sm,
  },
  stepText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    flex: 1,
  },
});

export default AddMemberScreen;
