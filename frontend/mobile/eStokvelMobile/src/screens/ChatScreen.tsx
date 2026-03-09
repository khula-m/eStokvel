import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, FlatList, ScrollView,
  ActivityIndicator, RefreshControl, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';
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

  const fetchMessages = useCallback(async () => {
    if (!selectedGroupId) return;
    try {
      const res = await axios.get(`${API_URL}/api/chat/groups/${selectedGroupId}/messages`, { headers });
      setMessages(res.data.data?.messages || []);
      await axios.put(`${API_URL}/api/chat/groups/${selectedGroupId}/read`, {}, { headers }).catch(() => {});
    } catch (e) {
      console.error('Messages fetch error:', e);
      if (refreshing || messagesLoading) {
        showAlert('Error', 'Failed to load messages');
      }
    }
    finally { setRefreshing(false); setMessagesLoading(false); }
  }, [selectedGroupId, auth.token]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!selectedGroupId) return;
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [selectedGroupId, fetchMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedGroupId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSending(true);
    try {
      await axios.post(`${API_URL}/api/chat/messages`, { stokvelGroupId: selectedGroupId, message: newMessage.trim() }, { headers });
      setNewMessage('');
      fetchMessages();
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const formatDateHeader = (date: string) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  if (loading) return <View style={cs.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={cs.container}>
      {/* Gradient Header */}
      <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={cs.header}>
        <View style={cs.headerRow}>
          <View style={cs.headerIconCircle}>
            <Icon name="chat-bubble" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cs.headerTitle}>Group Chat</Text>
            {selectedGroup && <Text style={cs.headerSubtitle}>{selectedGroup.name}</Text>}
          </View>
          <View style={cs.onlineDot} />
        </View>
      </LinearGradient>

      {/* Group Selector Chips */}
      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={cs.chipScroll} contentContainerStyle={{ paddingHorizontal: SPACING.md }}>
          {groups.map(g => (
            <TouchableOpacity key={g.id}
              style={[cs.chip, selectedGroupId === g.id && cs.chipActive]}
              onPress={() => { setSelectedGroupId(g.id); setMessagesLoading(true); Haptics.selectionAsync(); }}
              accessibilityLabel={`Select group ${g.name}`} accessibilityRole="button">
              <Text style={[cs.chipText, selectedGroupId === g.id && cs.chipTextActive]}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {groups.length === 0 ? (
        <View style={cs.emptyWrap}>
          <View style={cs.emptyIcon}><Icon name="chat-bubble" size={48} color={COLORS.textMuted} /></View>
          <Text style={cs.emptyTitle}>No Groups</Text>
          <Text style={cs.emptyText}>Join a group to start chatting</Text>
        </View>
      ) : (
        <>
          {messagesLoading ? (
            <View style={cs.emptyWrap}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[cs.emptyText, { marginTop: SPACING.md }]}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={cs.emptyWrap}>
              <View style={cs.emptyIcon}><Icon name="chat" size={48} color={COLORS.textMuted} /></View>
              <Text style={cs.emptyTitle}>No Messages Yet</Text>
              <Text style={cs.emptyText}>Be the first to say hello!</Text>
            </View>
          ) : (
            <FlatList
              ref={scrollRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMessages(); }} />}
              renderItem={({ item: msg, index: i }) => {
                const isMe = msg.sender.id === auth.user?.id;
                const showDate = i === 0 || formatDateHeader(messages[i - 1].createdAt) !== formatDateHeader(msg.createdAt);
                return (
                  <View>
                    {showDate && (
                      <View style={cs.dateSep}>
                        <View style={cs.dateLine} />
                        <Text style={cs.dateText}>{formatDateHeader(msg.createdAt)}</Text>
                        <View style={cs.dateLine} />
                      </View>
                    )}
                    <View style={[cs.bubble, isMe ? cs.bubbleMe : cs.bubbleOther]}>
                      {!isMe && <Text style={cs.senderName}>{msg.sender.fullName}</Text>}
                      <Text style={[cs.msgText, isMe && { color: '#fff' }]}>{msg.message || msg.content}</Text>
                      <Text style={[cs.time, isMe && { color: 'rgba(255,255,255,0.65)' }]}>{formatTime(msg.createdAt)}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Input Bar */}
          <View style={cs.inputBar}>
            <View style={cs.inputWrap}>
              <TextInput style={cs.input} value={newMessage} onChangeText={setNewMessage}
                placeholder="Type a message..." placeholderTextColor={COLORS.textMuted} multiline maxLength={500}
                onSubmitEditing={handleSend} accessibilityLabel="Message input" />
            </View>
            <TouchableOpacity
              style={[cs.sendBtn, (!newMessage.trim() || sending) && { opacity: 0.4 }]}
              onPress={handleSend} disabled={!newMessage.trim() || sending}
              accessibilityLabel="Send message" accessibilityRole="button">
              <LinearGradient colors={['#0A2463', '#1A43A8']} style={cs.sendGradient}>
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="send" size={18} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const cs = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: SPACING.md, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerIconCircle: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: scaleFontSize(20), fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: scaleFontSize(12), color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80' },

  chipScroll: { marginTop: SPACING.md, maxHeight: 50 },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface, marginRight: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.borderLight,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: scaleFontSize(13) },
  chipTextActive: { color: '#fff' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyIcon: {
    width: 88, height: 88, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: scaleFontSize(18), fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  emptyText: { fontSize: scaleFontSize(14), color: COLORS.textMuted, textAlign: 'center' },

  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  dateLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  dateText: {
    fontSize: 11, color: COLORS.textMuted, paddingHorizontal: SPACING.md,
    fontWeight: '600', letterSpacing: 0.3,
  },

  bubble: { maxWidth: '78%', borderRadius: RADIUS.lg + 4, padding: SPACING.md, marginVertical: 3 },
  bubbleMe: {
    backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4,
    ...shadow(2, 8, 0.12),
  },
  bubbleOther: {
    backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4,
    ...shadow(1, 6, 0.06),
  },
  senderName: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  msgText: { fontSize: scaleFontSize(15), color: '#1E293B', lineHeight: 22 },
  time: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    ...shadow(-1, 6, 0.04),
  },
  inputWrap: {
    flex: 1, backgroundColor: COLORS.borderLight, borderRadius: RADIUS.xl,
    marginRight: SPACING.sm,
  },
  input: {
    paddingHorizontal: SPACING.md + 2, paddingVertical: SPACING.sm + 2,
    fontSize: scaleFontSize(15), maxHeight: 100, color: '#1E293B',
  },
  sendBtn: { width: 46, height: 46 },
  sendGradient: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
    ...shadow(2, 8, 0.15),
  },
});
