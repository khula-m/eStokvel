import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

interface GetStartedScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

const GetStartedScreen: React.FC<GetStartedScreenProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const firstName = user?.fullName?.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="celebration" size={60} color={colors.primary} />
          </View>
          <Text style={styles.title}>Welcome, {firstName}!</Text>
          <Text style={styles.subtitle}>What would you like to do?</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Start a Stokvel */}
          <TouchableOpacity
            style={[styles.optionCard, styles.primaryOption]}
            onPress={() => onNavigate('createGroup')}
          >
            <View style={styles.optionIconContainer}>
              <MaterialIcons name="add-business" size={40} color={colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Start a Stokvel</Text>
              <Text style={styles.optionDescription}>
                Create a new group and invite members to join
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Join a Stokvel */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => onNavigate('joinGroup')}
          >
            <View style={styles.optionIconContainer}>
              <MaterialIcons name="group-add" size={40} color={colors.success} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Join a Stokvel</Text>
              <Text style={styles.optionDescription}>
                Have an invite code? Join an existing group
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>

          {/* Browse Public Groups */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => onNavigate('browseGroups')}
          >
            <View style={styles.optionIconContainer}>
              <MaterialIcons name="search" size={40} color={colors.info} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Browse Groups</Text>
              <Text style={styles.optionDescription}>
                Discover public stokvels in your area
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Skip for now */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => onNavigate('home')}
        >
          <Text style={styles.skipText}>I'll do this later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl * 2,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.text.secondary,
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryOption: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  skipButton: {
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  skipText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
});

export default GetStartedScreen;
