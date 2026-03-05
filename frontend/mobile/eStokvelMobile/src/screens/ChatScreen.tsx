import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS } from '../constants/theme';
import { styles } from '../styles';
import { AuthState, Group, ChatMsg } from '../types';

export const ChatScreen = ({ auth, initialGroupId }: { auth: AuthState; initialGroupId?: string | null }) => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroupId || null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const scrollRef = useRef<FlatList>(null);
  const headers = { Authorization: `Bearer ${auth.token}` };

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/groups`, { headers });
        const grps = res.data.data || [];
        setGroups(grps);
        if (!selectedGroupId && grps.length > 0) setSelectedGroupId(grps[0].id);
      } catch (e) {
        console.error('Chat groups fetch error:', e);
        showAlert('Error', 'Failed to load groups');
      }
      finally { setLoading(false); }
    };
    fetchGroups();
  }, [auth.token]);

  // Fetch messages when group changes
  const fetchMessages = useCallback(async () => {
    if (!selectedGroupId) return;
    try {
      const res = await axios.get(`${API_URL}/api/chat/groups/${selectedGroupId}/messages`, { headers });
      setMessages(res.data.data?.messages || []);
      // Mark as read
      await axios.put(`${API_URL}/api/chat/groups/${selectedGroupId}/read`, {}, { headers }).catch(() => {});
    } catch (e) {
      console.error('Messages fetch error:', e);
      // Only show alert on non-background fetch (not polling)
      if (refreshing || messagesLoading) {
        showAlert('Error', 'Failed to load messages');
      }
    }
    finally { setRefreshing(false); setMessagesLoading(false); }
  }, [selectedGroupId, auth.token]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!selectedGroupId) return;
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [selectedGroupId, fetchMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedGroupId) return;
    setSending(true);
    try {
      await axios.post(`${API_URL}/api/chat/messages`, { stokvelGroupId: selectedGroupId, message: newMessage.trim() }, { headers });
      setNewMessage('');
      fetchMessages();
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const formatDateHeader = (date: string) => new Date(date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.screenContainer}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <Icon name="chat-bubble" size={24} color={COLORS.primary} />
        <Text style={styles.screenTitle}>Group Chat</Text>
      </View>

      {/* Group Selector */}
      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingBottom: 8, maxHeight: 50 }}>
          {groups.map(g => (
            <TouchableOpacity key={g.id} style={[styles.chatGroupChip, selectedGroupId === g.id && styles.chatGroupChipActive]}
              onPress={() => { setSelectedGroupId(g.id); setMessagesLoading(true); }}
              accessibilityLabel={`Select group ${g.name}`} accessibilityRole="button">
              <Text style={[styles.chatGroupChipText, selectedGroupId === g.id && styles.chatGroupChipTextActive]}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {groups.length === 0 ? (
        <View style={[styles.emptyState, { flex: 1 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: '#F1F5F9' }]}>
            <Icon name="chat-bubble" size={48} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No Groups</Text>
          <Text style={styles.emptyText}>Join a group to start chatting</Text>
        </View>
      ) : (
        <>
          {/* Messages */}
          {messagesLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ color: COLORS.textLight, marginTop: 12, fontSize: 14 }}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <View style={[styles.emptyIcon, { backgroundColor: '#F1F5F9' }]}>
                <Icon name="chat" size={48} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No Messages Yet</Text>
              <Text style={styles.emptyText}>Be the first to say hello!</Text>
            </View>
          ) : (
            <FlatList
              ref={scrollRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={{ flex: 1, paddingHorizontal: 16 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMessages(); }} />}
              ListFooterComponent={<View style={{ height: 10 }} />}
              renderItem={({ item: msg, index: i }) => {
                const isMe = msg.sender.id === auth.user?.id;
                const showDate = i === 0 || formatDateHeader(messages[i - 1].createdAt) !== formatDateHeader(msg.createdAt);
                return (
                  <View>
                    {showDate && (
                      <View style={styles.chatDateSeparator}>
                        <Text style={styles.chatDateText}>{formatDateHeader(msg.createdAt)}</Text>
                      </View>
                    )}
                    <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
                      {!isMe && <Text style={styles.chatSenderName}>{msg.sender.fullName}</Text>}
                      <Text style={[styles.chatMessageText, isMe && { color: '#fff' }]}>{msg.message || msg.content}</Text>
                      <Text style={[styles.chatTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>{formatTime(msg.createdAt)}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Send Bar */}
          <View style={styles.chatInputBar}>
            <TextInput style={styles.chatInput} value={newMessage} onChangeText={setNewMessage}
              placeholder="Type a message..." placeholderTextColor="#999" multiline maxLength={500}
              onSubmitEditing={handleSend}
              accessibilityLabel="Message input"
            />
            <TouchableOpacity style={[styles.chatSendBtn, (!newMessage.trim() || sending) && { opacity: 0.5 }]}
              onPress={handleSend} disabled={!newMessage.trim() || sending}
              accessibilityLabel="Send message" accessibilityRole="button">
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="send" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};
