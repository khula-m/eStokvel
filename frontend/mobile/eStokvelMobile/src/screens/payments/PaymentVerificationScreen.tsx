import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import apiService from '../../services/api';

interface PaymentVerificationScreenParams {
  groupId: string;
  groupName: string;
}

type Props = NativeStackScreenProps<any, 'PaymentVerification'>;

interface PendingPayment {
  id: string;
  amount: number;
  type: string;
  status: string;
  paymentProof: string | null;
  createdAt: string;
  member: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
}

export default function PaymentVerificationScreen({ route, navigation }: Props) {
  const { groupId, groupName } = route.params as PaymentVerificationScreenParams;

  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: 'Verify Payments',
    });
    fetchPendingPayments();
  }, [navigation]);

  const fetchPendingPayments = async () => {
    try {
      const response = await apiService.get(`/payments/groups/${groupId}/pending`);
      if (response.data.success) {
        setPayments(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch pending payments:', error);
      Alert.alert('Error', 'Failed to load pending payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPendingPayments();
  }, [groupId]);

  const handleVerify = async (transactionId: string, verified: boolean) => {
    const action = verified ? 'approve' : 'reject';
    
    Alert.alert(
      `${verified ? 'Approve' : 'Reject'} Payment`,
      `Are you sure you want to ${action} this payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: verified ? 'Approve' : 'Reject',
          style: verified ? 'default' : 'destructive',
          onPress: async () => {
            setVerifying(transactionId);
            try {
              const response = await apiService.put(
                `/payments/transactions/${transactionId}/verify`,
                { verified }
              );

              if (response.data.success) {
                Alert.alert(
                  'Success',
                  `Payment ${verified ? 'approved' : 'rejected'} successfully`
                );
                // Remove from list or refresh
                setPayments((prev) => prev.filter((p) => p.id !== transactionId));
              } else {
                Alert.alert('Error', response.data.message || `Failed to ${action} payment`);
              }
            } catch (error: any) {
              console.error(`Failed to ${action} payment:`, error);
              Alert.alert('Error', error.response?.data?.message || `Failed to ${action} payment`);
            } finally {
              setVerifying(null);
            }
          },
        },
      ]
    );
  };

  const viewProofImage = (imageUrl: string) => {
    // In real app, this would be the full URL to the uploaded image
    const fullUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `${apiService.defaults.baseURL?.replace('/api', '')}/${imageUrl}`;
    setSelectedImage(fullUrl);
    setModalVisible(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPaymentItem = ({ item }: { item: PendingPayment }) => {
    const memberName = `${item.member.user.firstName} ${item.member.user.lastName}`;
    const isVerifying = verifying === item.id;

    return (
      <View style={styles.paymentCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.memberInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.member.user.firstName[0]}{item.member.user.lastName[0]}
              </Text>
            </View>
            <View>
              <Text style={styles.memberName}>{memberName}</Text>
              <Text style={styles.memberPhone}>{item.member.user.phone}</Text>
            </View>
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>R {Number(item.amount).toFixed(2)}</Text>
            <Text style={styles.type}>{item.type}</Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={14} color={colors.text.disabled} />
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Payment Proof */}
        {item.paymentProof ? (
          <TouchableOpacity
            style={styles.proofContainer}
            onPress={() => viewProofImage(item.paymentProof!)}
          >
            <Ionicons name="document-attach" size={20} color={colors.primary} />
            <Text style={styles.proofText}>View Payment Proof</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.disabled} />
          </TouchableOpacity>
        ) : (
          <View style={styles.noProofContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
            <Text style={styles.noProofText}>No payment proof uploaded</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.rejectButton, isVerifying && styles.buttonDisabled]}
            onPress={() => handleVerify(item.id, false)}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveButton, isVerifying && styles.buttonDisabled]}
            onPress={() => handleVerify(item.id, true)}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="checkmark-done-circle-outline" size={64} color={colors.success} />
      </View>
      <Text style={styles.emptyTitle}>All Caught Up!</Text>
      <Text style={styles.emptyText}>
        No pending payments to verify. All member payments have been processed.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading pending payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={styles.groupName}>{groupName}</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingCount}>{payments.length}</Text>
          <Text style={styles.pendingLabel}>Pending</Text>
        </View>
      </View>

      {/* Payments List */}
      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item: PendingPayment) => item.id}
        contentContainerStyle={[
          styles.listContent,
          payments.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      />

      {/* Image Preview Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  pendingCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warning,
  },
  pendingLabel: {
    fontSize: 14,
    color: colors.warning,
  },
  listContent: {
    padding: spacing.md,
  },
  emptyListContent: {
    flex: 1,
  },
  paymentCard: {
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  memberPhone: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  type: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  dateText: {
    fontSize: 13,
    color: colors.text.disabled,
  },
  proofContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  proofText: {
    flex: 1,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  noProofContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  noProofText: {
    fontSize: 14,
    color: colors.warning,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  rejectButtonText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.xs,
  },
  approveButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: spacing.sm,
  },
  modalImage: {
    width: '90%',
    height: '80%',
  },
});
