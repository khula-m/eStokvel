import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import apiService from '../../services/api';

// Types
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  messageType: 'TEXT' | 'SYSTEM' | 'CONTRIBUTION_ALERT' | 'PAYOUT_ALERT';
  createdAt: string;
  isRead: boolean;
}

interface ChatScreenParams {
  groupId: string;
  groupName: string;
}

type Props = NativeStackScreenProps<any, 'Chat'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { groupId, groupName } = route.params as ChatScreenParams;
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: groupName || 'Group Chat',
    });
  }, [groupName, navigation]);

  // Fetch messages
  const fetchMessages = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.get(`/chat/groups/${groupId}/messages`);
      if (response.data.success) {
        setMessages(response.data.data.messages || []);
        
        // Mark messages as read
        await apiService.put(`/chat/groups/${groupId}/read`);
      }
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
      if (showLoading) {
        setError(err.response?.data?.message || 'Failed to load messages');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  // Initial load and polling
  useEffect(() => {
    fetchMessages(true);
    
    // Poll for new messages every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(false);
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchMessages]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      const response = await apiService.post('/chat/messages', {
        stokvelGroupId: groupId,
        message: messageText,
      });
      
      if (response.data.success) {
        // Add message to list immediately
        setMessages(prev => [...prev, response.data.data]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Show the message that failed to send
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages(false);
  };

  // Format timestamp
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[date.getDay()] + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Render message bubble
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.senderId === user?.id;
    const isSystemMessage = item.messageType !== 'TEXT';
    
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={[
            styles.systemMessage,
            item.messageType === 'CONTRIBUTION_ALERT' && styles.contributionAlert,
            item.messageType === 'PAYOUT_ALERT' && styles.payoutAlert,
          ]}>
            {item.messageType === 'CONTRIBUTION_ALERT' && (
              <Ionicons name="wallet-outline" size={16} color={colors.success} style={styles.systemIcon} />
            )}
            {item.messageType === 'PAYOUT_ALERT' && (
              <Ionicons name="cash-outline" size={16} color={colors.primary} style={styles.systemIcon} />
            )}
            <Text style={styles.systemMessageText}>{item.message}</Text>
          </View>
          <Text style={styles.systemTime}>{formatTime(item.createdAt)}</Text>
        </View>
      );
    }
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}>
        {!isOwnMessage && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}>
            {item.message}
          </Text>
        </View>
        <Text style={[
          styles.timestamp,
          isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
        ]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.gray[400]} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchMessages(true)}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item: ChatMessage) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.gray[400]} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Be the first to say hello!</Text>
          </View>
        }
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.gray[500]}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 16,
  },
  errorText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptySubtext: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.text.secondary,
  },
  messageContainer: {
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
    marginLeft: spacing.sm,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: 16,
    maxWidth: '100%',
  },
  ownMessage: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: colors.white,
  },
  otherMessageText: {
    color: colors.text.primary,
  },
  timestamp: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 4,
  },
  ownTimestamp: {
    marginRight: spacing.sm,
  },
  otherTimestamp: {
    marginLeft: spacing.sm,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  systemMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  contributionAlert: {
    backgroundColor: '#E8F5E9',
  },
  payoutAlert: {
    backgroundColor: colors.primaryLight,
  },
  systemIcon: {
    marginRight: spacing.xs,
  },
  systemMessageText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  systemTime: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: spacing.sm,
    marginRight: spacing.sm,
    fontSize: 16,
    color: colors.text.primary,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray[400],
  },
});
