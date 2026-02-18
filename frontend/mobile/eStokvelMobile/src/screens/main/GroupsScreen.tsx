import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, fontSize } from '../../theme/spacing';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

interface Group {
  id: string;
  name: string;
  code: string;
  description?: string;
  contributionAmount: number;
  contributionFrequency: string;
  memberCount: number;
  userRole: string;
  createdAt: string;
}

type ViewMode = 'list' | 'create' | 'join';

const GroupsScreen: React.FC = () => {
  const { token } = useAuthStore();
  const navigation = useNavigation<any>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const formatFrequency = (freq: string) => {
    switch (freq) {
      case 'WEEKLY': return 'Weekly';
      case 'BIWEEKLY': return 'Bi-weekly';
      case 'MONTHLY': return 'Monthly';
      default: return freq;
    }
  };

  const fetchGroups = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/groups`, { headers });
      const data = response.data.data || [];
      setGroups(data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchGroups();
    }
  }, [token, fetchGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'TREASURER': return colors.success;
      default: return colors.text.secondary;
    }
  };

  const getRoleIcon = (role: string): keyof typeof MaterialIcons.glyphMap => {
    switch (role) {
      case 'TREASURER': return 'account-balance-wallet';
      default: return 'person';
    }
  };

  const handleGroupPress = (group: Group) => {
    Alert.alert(
      group.name,
      `Invite Code: ${group.code}\n\nContribution: ${formatCurrency(group.contributionAmount)} ${formatFrequency(group.contributionFrequency)}\n\nMembers: ${group.memberCount}\nYour Role: ${group.userRole}`,
      [
        { 
          text: 'Chat', 
          onPress: () => navigation.navigate('Chat', { groupId: group.id, groupName: group.name }) 
        },
        { text: 'Share Code', onPress: () => shareGroupCode(group) },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const shareGroupCode = (group: Group) => {
    Alert.alert(
      'Share Invite Code',
      `Share this code with others to join "${group.name}":\n\n${group.code}`,
      [{ text: 'OK' }]
    );
  };

  const handleCreateGroup = () => {
    Alert.alert(
      'Create New Stokvel',
      'Go to the Home tab to create a new stokvel group.',
      [{ text: 'OK' }]
    );
  };

  const handleJoinGroup = () => {
    Alert.alert(
      'Join a Stokvel',
      'Go to the Home tab to join an existing stokvel using an invite code.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading groups...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateGroup}>
          <MaterialIcons name="add-circle" size={24} color={colors.primary} />
          <Text style={styles.actionButtonText}>Create Group</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleJoinGroup}>
          <MaterialIcons name="group-add" size={24} color={colors.success} />
          <Text style={styles.actionButtonText}>Join Group</Text>
        </TouchableOpacity>
      </View>

      {/* Groups List */}
      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="groups" size={64} color={colors.gray[300]} />
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create a new stokvel or join an existing one to get started
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>My Stokvels ({groups.length})</Text>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => handleGroupPress(group)}
              activeOpacity={0.7}
            >
              <View style={styles.groupHeader}>
                <View style={styles.groupIconContainer}>
                  <MaterialIcons name="savings" size={28} color={colors.primary} />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <View style={styles.groupMeta}>
                    <Text style={styles.groupCode}>Code: {group.code}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(group.userRole) + '20' }]}>
                      <MaterialIcons name={getRoleIcon(group.userRole)} size={12} color={getRoleColor(group.userRole)} />
                      <Text style={[styles.roleText, { color: getRoleColor(group.userRole) }]}>
                        {group.userRole}
                      </Text>
                    </View>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.gray[400]} />
              </View>

              <View style={styles.groupStats}>
                <View style={styles.statItem}>
                  <MaterialIcons name="payments" size={16} color={colors.text.secondary} />
                  <Text style={styles.statText}>
                    {formatCurrency(group.contributionAmount)} {formatFrequency(group.contributionFrequency)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="people" size={16} color={colors.text.secondary} />
                  <Text style={styles.statText}>{group.memberCount} members</Text>
                </View>
              </View>

              {group.description && (
                <Text style={styles.groupDescription} numberOfLines={2}>
                  {group.description}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: fontSize.md,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  groupCode: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  groupStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  groupDescription: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});

export default GroupsScreen;
