import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

/**
 * InvitationFlow - Visual presentation component showing how member invitations work
 * For presentation purposes only
 */
export const InvitationFlow: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="how-to-reg" size={32} color={colors.primary} />
        <Text style={styles.title}>Member Invitation Flow</Text>
        <Text style={styles.subtitle}>How treasurers invite and onboard new members</Text>
      </View>

      {/* Step 1 */}
      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>1</Text>
        </View>
        <View style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <MaterialIcons name="person-add" size={24} color={colors.primary} />
            <Text style={styles.stepTitle}>Treasurer Adds Member</Text>
          </View>
          <View style={styles.mockScreen}>
            <View style={styles.mockHeader}>
              <Text style={styles.mockHeaderText}>Add New Member</Text>
            </View>
            <View style={styles.mockInput}>
              <MaterialIcons name="phone" size={16} color={colors.text.secondary} />
              <Text style={styles.mockInputText}>+27 83 123 4567</Text>
            </View>
            <View style={styles.mockButton}>
              <Text style={styles.mockButtonText}>Send Invitation</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <MaterialIcons name="arrow-downward" size={32} color={colors.primary} />
      </View>

      {/* Step 2 */}
      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>2</Text>
        </View>
        <View style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <MaterialIcons name="send" size={24} color={colors.secondary} />
            <Text style={styles.stepTitle}>System Sends SMS</Text>
          </View>
          <View style={styles.smsCard}>
            <View style={styles.smsHeader}>
              <MaterialIcons name="sms" size={20} color={colors.white} />
              <Text style={styles.smsHeaderText}>SMS Message</Text>
            </View>
            <View style={styles.smsBody}>
              <Text style={styles.smsText}>
                🎉 You've been invited to join "Ubuntu Savings" stokvel!
              </Text>
              <Text style={styles.smsText}>Your invitation code: STK-7B3A9</Text>
              <Text style={styles.smsText}>
                📱 Download eStokvel app or dial *134*STOKVEL#
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <MaterialIcons name="arrow-downward" size={32} color={colors.primary} />
      </View>

      {/* Step 3 */}
      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>3</Text>
        </View>
        <View style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <MaterialIcons name="smartphone" size={24} color={colors.info} />
            <Text style={styles.stepTitle}>Member Receives SMS</Text>
          </View>
          <View style={styles.phoneFrame}>
            <View style={styles.phoneScreen}>
              <View style={styles.notificationBar}>
                <MaterialIcons name="signal-cellular-4-bar" size={12} color={colors.white} />
                <MaterialIcons name="battery-full" size={12} color={colors.white} />
              </View>
              <View style={styles.smsNotification}>
                <MaterialIcons name="message" size={16} color={colors.white} />
                <Text style={styles.smsNotificationText}>New message</Text>
              </View>
              <View style={styles.phoneMessage}>
                <Text style={styles.phoneMessageText}>
                  You've been invited to join "Ubuntu Savings" stokvel!
                </Text>
                <Text style={styles.phoneMessageText}>Code: STK-7B3A9</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <MaterialIcons name="arrow-downward" size={32} color={colors.primary} />
      </View>

      {/* Step 4 */}
      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>4</Text>
        </View>
        <View style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <MaterialIcons name="login" size={24} color={colors.success} />
            <Text style={styles.stepTitle}>Member Enters Code</Text>
          </View>
          <View style={styles.mockScreen}>
            <View style={styles.mockHeader}>
              <Text style={styles.mockHeaderText}>Join Stokvel</Text>
            </View>
            <View style={styles.mockInput}>
              <MaterialIcons name="vpn-key" size={16} color={colors.text.secondary} />
              <Text style={styles.mockInputText}>STK-7B3A9</Text>
            </View>
            <View style={[styles.mockButton, styles.mockButtonSuccess]}>
              <Text style={styles.mockButtonText}>Join Group</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <MaterialIcons name="arrow-downward" size={32} color={colors.primary} />
      </View>

      {/* Step 5 */}
      <View style={styles.stepContainer}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>5</Text>
        </View>
        <View style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <MaterialIcons name="check-circle" size={24} color={colors.success} />
            <Text style={styles.stepTitle}>Auto-Added to Group</Text>
          </View>
          <View style={styles.successCard}>
            <MaterialIcons name="celebration" size={32} color={colors.success} />
            <Text style={styles.successTitle}>Welcome to Ubuntu Savings!</Text>
            <Text style={styles.successText}>You've been added to the group</Text>
            <View style={styles.successStats}>
              <View style={styles.successStat}>
                <Text style={styles.successStatValue}>15</Text>
                <Text style={styles.successStatLabel}>Members</Text>
              </View>
              <View style={styles.successStat}>
                <Text style={styles.successStatValue}>R200</Text>
                <Text style={styles.successStatLabel}>Monthly</Text>
              </View>
              <View style={styles.successStat}>
                <Text style={styles.successStatValue}>Weekly</Text>
                <Text style={styles.successStatLabel}>Frequency</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Alternative Methods */}
      <View style={styles.alternativeSection}>
        <Text style={styles.alternativeTitle}>Alternative Access Methods</Text>
        <View style={styles.alternativeRow}>
          <View style={styles.alternativeCard}>
            <MaterialIcons name="phone-android" size={32} color={colors.primary} />
            <Text style={styles.alternativeLabel}>Smartphone App</Text>
            <Text style={styles.alternativeText}>Full features, visual interface</Text>
          </View>
          <View style={styles.alternativeCard}>
            <MaterialIcons name="phone" size={32} color={colors.secondary} />
            <Text style={styles.alternativeLabel}>USSD *134#</Text>
            <Text style={styles.alternativeText}>Basic phone, no internet</Text>
          </View>
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
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.white,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  mockScreen: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mockHeader: {
    marginBottom: spacing.md,
  },
  mockHeaderText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  mockInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mockInputText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  mockButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  mockButtonSuccess: {
    backgroundColor: colors.success,
  },
  mockButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.white,
  },
  smsCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  smsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryDark,
    padding: spacing.md,
  },
  smsHeaderText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: spacing.sm,
  },
  smsBody: {
    padding: spacing.lg,
    backgroundColor: colors.white,
  },
  smsText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  phoneFrame: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  phoneScreen: {
    width: 200,
    height: 350,
    backgroundColor: colors.info,
    borderRadius: 20,
    borderWidth: 8,
    borderColor: colors.black,
    overflow: 'hidden',
  },
  notificationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.xs,
    backgroundColor: colors.black + '80',
  },
  smsNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black + '60',
    padding: spacing.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  smsNotificationText: {
    color: colors.white,
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  phoneMessage: {
    backgroundColor: colors.white,
    margin: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  phoneMessageText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  arrowContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  successCard: {
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.success,
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.success,
    marginTop: spacing.md,
  },
  successText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  successStats: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.xl,
  },
  successStat: {
    alignItems: 'center',
  },
  successStatValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.success,
  },
  successStatLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  alternativeSection: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  alternativeTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  alternativeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  alternativeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alternativeLabel: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  alternativeText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
