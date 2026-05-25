import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  Modal, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, StyleSheet, PanResponder,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { Icon, IconName } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';
import { shadow } from '../utils/shadow';
import { formatCurrency, formatDateShort as formatDate, formatDateTime } from '../utils/format';
import { styles } from '../styles';
import { getGroupRole, isSuperAdmin } from '../utils/roles';
import { AuthState, Group, Transaction, GroupMember, Announcement, Meeting } from '../types';
import OzowPaymentWebView from '../components/OzowPaymentWebView';
import { PaymentModal } from '../components/PaymentModal';
import { LedgerScreen } from './LedgerScreen';

interface DashboardScreenProps {
  auth: AuthState;
  onLogout: () => void;
  onNavigateTab: (tab: string, groupId?: string) => void;
  onAuthRefresh: () => Promise<void>;
}

export const DashboardScreen = ({ auth, onLogout, onNavigateTab, onAuthRefresh }: DashboardScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const superAdmin = isSuperAdmin(auth.user);

  // Per-group role lookup. ALL permission decisions for a specific group
  // (showing admin buttons, allowing delete, etc.) must go through this.
  const roleForGroup = (groupId: string): 'ADMIN' | 'MEMBER' =>
    getGroupRole(auth.user, groupId);
  const headers = { Authorization: `Bearer ${auth.token}` };

  // ---- NAVIGATION STATE ----
  //
  // Three-level nav: list → group-home → feature sub-screen.
  //
  //   'list'              The dashboard. All groups the user belongs to, with
  //                       per-group role badges. Tapping a card enters that
  //                       group's context.
  //   'home'              The selected group's home — feature tile grid.
  //                       Role-aware: ADMIN sees admin tiles, MEMBER doesn't.
  //                       The role badge on this screen is the user's role in
  //                       THIS specific group, not a global flag.
  //   '<feature>'         A specific feature inside the selected group.
  //
  // selectedGroup is null only when groupView === 'list'.
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupView, setGroupView] = useState<
    'list' | 'home' | 'analytics' | 'announcements' | 'meetings' | 'members' | 'payments' | 'ledger'
  >('list');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [groupTransactions, setGroupTransactions] = useState<Transaction[]>([]);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [newMeetTitle, setNewMeetTitle] = useState('');
  const [newMeetDesc, setNewMeetDesc] = useState('');
  const [newMeetDate, setNewMeetDate] = useState('');
  const [newMeetLocation, setNewMeetLocation] = useState('');
  // Date/time scroll picker state for meetings
  const [meetDay, setMeetDay] = useState(new Date().getDate());
  const [meetMonth, setMeetMonth] = useState(new Date().getMonth());
  const [meetYear, setMeetYear] = useState(new Date().getFullYear());
  const [meetHour, setMeetHour] = useState(18);
  const [meetMinute, setMeetMinute] = useState(0);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupAmount, setNewGroupAmount] = useState('');
  const [newGroupFreq, setNewGroupFreq] = useState('MONTHLY');
  const [newGroupDuration, setNewGroupDuration] = useState('12');
  const [newGroupPayoutModel, setNewGroupPayoutModel] = useState<'ROTATING' | 'END_OF_TERM'>('ROTATING');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // ---- ADMIN PAYMENT GATEWAY STATE ----
  const [bankDetails, setBankDetails] = useState<{ bankName: string; accountNumber: string; accountHolder: string; branchCode: string }>({ bankName: '', accountNumber: '', accountHolder: '', branchCode: '' });
  const [savingBankDetails, setSavingBankDetails] = useState(false);

  // ---- ADMIN ADD MEMBER STATE ----
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberFirstName, setNewMemberFirstName] = useState('');
  const [newMemberLastName, setNewMemberLastName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addedMemberPin, setAddedMemberPin] = useState('');
  const [addedMemberSuccess, setAddedMemberSuccess] = useState(false);

  // ---- MEMBER STATE ----
  const [memberGroups, setMemberGroups] = useState<Group[]>([]);
  const [selectedMemberGroupIdx, setSelectedMemberGroupIdx] = useState(0);
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [memberAnnouncements, setMemberAnnouncements] = useState<Announcement[]>([]);
  const [memberMeetings, setMemberMeetings] = useState<Meeting[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentGroup, setPaymentGroup] = useState<Group | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('EFT');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // ---- ASYNC UI STATES ----
  const [subScreenLoading, setSubScreenLoading] = useState(false);
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [submittingMeeting, setSubmittingMeeting] = useState(false);
  const [rsvpingMeetingId, setRsvpingMeetingId] = useState<string | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);

  // ---- JOIN GROUP STATE ----
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [joinGroupCode, setJoinGroupCode] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(false);

  // ---- OZOW PAYMENT STATE ----
  const [showOzowWebView, setShowOzowWebView] = useState(false);
  const [ozowUrl, setOzowUrl] = useState('');
  const [ozowPaymentData, setOzowPaymentData] = useState<Record<string, string>>({});
  const [ozowTransactionId, setOzowTransactionId] = useState('');

  // ========== FETCH DATA ==========
  // Single fetch path for everyone (except SUPERADMIN, which renders a static
  // "use the web portal" screen). The same group list drives both admin and
  // member rendering — per-card role gating decides which controls show.
  const fetchDashboardData = useCallback(async () => {
    try {
      const h = { Authorization: `Bearer ${auth.token}` };
      const [groupsRes, transRes] = await Promise.all([
        axios.get(`${API_URL}/api/groups`, { headers: h }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_URL}/api/transactions/my`, { headers: h }).catch(() => ({ data: { data: { transactions: [] } } })),
      ]);
      const grps = groupsRes.data.data || [];
      // Both state slices point at the same list; the legacy split exists
      // only because admin/member used to be separate views.
      setGroups(grps);
      setMemberGroups(grps);
      const td = transRes.data.data;
      setMyTransactions(Array.isArray(td) ? td : (td?.transactions || []));
      if (grps.length > 0) {
        const gid = grps[selectedMemberGroupIdx]?.id || grps[0].id;
        const [annRes, meetRes] = await Promise.all([
          axios.get(`${API_URL}/api/announcements/group/${gid}`, { headers: h }).catch(() => ({ data: { data: { announcements: [] } } })),
          axios.get(`${API_URL}/api/meetings/group/${gid}`, { headers: h }).catch(() => ({ data: { data: { meetings: [] } } })),
        ]);
        setMemberAnnouncements(annRes.data.data?.announcements || []);
        const mtgs = meetRes.data.data;
        setMemberMeetings(Array.isArray(mtgs) ? mtgs : (mtgs?.meetings || []));
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      showAlert('Connection Error', 'Failed to load dashboard data. Pull down to retry.');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [auth.token, selectedMemberGroupIdx]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };



  // ========== GROUP NAVIGATION ==========

  type FeatureView = 'analytics' | 'announcements' | 'meetings' | 'members' | 'payments';

  // Enter the group-home (the new role-aware feature grid). Called when the
  // user taps a card on the dashboard list. The home screen itself doesn't
  // hit the network — it just renders tiles. Sub-screen data is loaded only
  // when the user actually opens a feature.
  const openGroupHome = (group: Group) => {
    setSelectedGroup(group);
    setGroupView('home');
  };

  // Swipe-right-to-go-back for group sub-screens and group home.
  // Uses a callback ref so the handler always closes over the current groupView.
  const swipeBackFn = useRef<() => void>(() => {});
  swipeBackFn.current = () => {
    if (groupView === 'home') { setGroupView('list'); setSelectedGroup(null); }
    else if (groupView !== 'list') { setGroupView('home'); }
  };
  const swipeBack = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        gs.dx > 15 && Math.abs(gs.dy) < 50 && gs.x0 < 60,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 80) swipeBackFn.current();
      },
    })
  ).current;

  // Open a feature sub-screen inside the currently-selected group's context.
  // Called from the group-home tiles. Loads only the data needed by that
  // feature so we don't pay the cost up-front for tiles the user never taps.
  const openFeature = async (view: FeatureView, group: Group) => {
    setSelectedGroup(group); setGroupView(view);
    // Reset sub-screen data to prevent showing stale data from previous group
    if (view === 'members') setGroupMembers([]);
    else if (view === 'announcements') setAnnouncements([]);
    else if (view === 'meetings') setMeetings([]);
    else if (view === 'analytics') setGroupTransactions([]);
    setSubScreenLoading(true);
    const h = { Authorization: `Bearer ${auth.token}` };
    try {
      if (view === 'members') {
        const res = await axios.get(`${API_URL}/api/groups/${group.id}/members`, { headers: h });
        setGroupMembers(res.data.data || []);
      } else if (view === 'announcements') {
        const res = await axios.get(`${API_URL}/api/announcements/group/${group.id}`, { headers: h });
        const annData = res.data.data;
        setAnnouncements(Array.isArray(annData) ? annData : (annData?.announcements || []));
      } else if (view === 'meetings') {
        const res = await axios.get(`${API_URL}/api/meetings/group/${group.id}`, { headers: h });
        const mtgData = res.data.data;
        setMeetings(Array.isArray(mtgData) ? mtgData : (mtgData?.meetings || []));
      } else if (view === 'analytics') {
        const transRes = await axios.get(`${API_URL}/api/transactions?stokvelGroupId=${group.id}`, { headers: h }).catch(() => ({ data: { data: { transactions: [] } } }));
        const td = transRes.data.data;
        const allTx = Array.isArray(td) ? td : (td?.transactions || []);
        setGroupTransactions(allTx);
      } else if (view === 'payments') {
        const bankRes = await axios.get(`${API_URL}/api/payments/groups/${group.id}/bank-details`, { headers: h }).catch(() => ({ data: { data: {} } }));
        const bd = bankRes.data.data || {};
        setBankDetails({ bankName: bd.bankName || '', accountNumber: bd.accountNumber || '', accountHolder: bd.accountHolder || '', branchCode: bd.branchCode || '' });
      }
    } catch (e) {
      console.error('Sub-screen fetch error:', e);
      showAlert('Error', 'Failed to load data. Please go back and try again.');
    } finally { setSubScreenLoading(false); }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnContent.trim() || !selectedGroup) return;
    setSubmittingAnnouncement(true);
    try {
      await axios.post(`${API_URL}/api/announcements`, { title: newAnnTitle.trim(), content: newAnnContent.trim(), groupId: selectedGroup.id }, { headers });
      setNewAnnTitle(''); setNewAnnContent(''); setShowAnnouncementForm(false);
      const res = await axios.get(`${API_URL}/api/announcements/group/${selectedGroup.id}`, { headers });
      const annData = res.data.data;
      setAnnouncements(Array.isArray(annData) ? annData : (annData?.announcements || []));
      showAlert('Success', 'Announcement posted!');
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
    finally { setSubmittingAnnouncement(false); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setDeletingAnnouncementId(id);
    try {
      await axios.delete(`${API_URL}/api/announcements/${id}`, { headers });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showAlert('Success', 'Announcement deleted');
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
    finally { setDeletingAnnouncementId(null); }
  };

  const handleCreateMeeting = async () => {
    if (!newMeetTitle.trim() || !selectedGroup) { showAlert('Error', 'Title is required'); return; }
    // Build date from picker values
    const parsedDate = new Date(meetYear, meetMonth, meetDay, meetHour, meetMinute);
    if (isNaN(parsedDate.getTime()) || parsedDate <= new Date()) { showAlert('Error', 'Please select a future date and time'); return; }
    setSubmittingMeeting(true);
    try {
      await axios.post(`${API_URL}/api/meetings`, {
        title: newMeetTitle.trim(), description: newMeetDesc.trim() || undefined,
        date: parsedDate.toISOString(), location: newMeetLocation.trim() || undefined, groupId: selectedGroup.id,
      }, { headers });
      setNewMeetTitle(''); setNewMeetDesc(''); setNewMeetDate(''); setNewMeetLocation(''); setShowMeetingForm(false);
      const res = await axios.get(`${API_URL}/api/meetings/group/${selectedGroup.id}`, { headers });
      const mtgData = res.data.data;
      setMeetings(Array.isArray(mtgData) ? mtgData : (mtgData?.meetings || []));
      showAlert('Success', 'Meeting scheduled!');
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
    finally { setSubmittingMeeting(false); }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupAmount.trim()) { showAlert('Error', 'Name and amount are required'); return; }
    setCreatingGroup(true);
    try {
      await axios.post(`${API_URL}/api/groups`, {
        name: newGroupName.trim(), description: newGroupDesc.trim() || undefined,
        contributionAmount: parseFloat(newGroupAmount), contributionFrequency: newGroupFreq,
        durationMonths: parseInt(newGroupDuration) || 12, payoutModel: newGroupPayoutModel,
      }, { headers });
      setNewGroupName(''); setNewGroupDesc(''); setNewGroupAmount(''); setNewGroupDuration('12'); setNewGroupPayoutModel('ROTATING'); setShowCreateGroupModal(false);
      // Refresh auth state first so effectiveRole updates to ADMIN before the
      // dashboard data fetch — this handles the "member creates first group" scenario.
      await onAuthRefresh();
      fetchDashboardData();
      showAlert('Success', 'Group created!');
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
    finally { setCreatingGroup(false); }
  };

  const handleAddMember = async () => {
    if (!newMemberFirstName.trim() || !newMemberLastName.trim() || !newMemberPhone.trim()) { showAlert('Error', 'Please enter first name, last name, and phone number'); return; }
    if (!/^0\d{9}$/.test(newMemberPhone.trim())) { showAlert('Error', 'Phone must be 10 digits starting with 0'); return; }
    if (!selectedGroup) { showAlert('Error', 'No group selected'); return; }
    setAddingMember(true); setAddedMemberPin(''); setAddedMemberSuccess(false);
    try {
      const res = await axios.post(`${API_URL}/api/auth/member/add`, {
        firstName: newMemberFirstName.trim(), lastName: newMemberLastName.trim(), phoneNumber: newMemberPhone.trim(), groupId: selectedGroup.id,
      }, { headers, timeout: 15000 });
      if (res.data.success) {
        setAddedMemberPin(res.data.data?.tempPin || '');
        setAddedMemberSuccess(true);
        setNewMemberFirstName(''); setNewMemberLastName(''); setNewMemberPhone('');
        // Refresh members list
        const membersRes = await axios.get(`${API_URL}/api/groups/${selectedGroup.id}/members`, { headers });
        setGroupMembers(membersRes.data.data || []);
      } else { showAlert('Error', res.data.message || 'Failed to add member'); }
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to add member'); }
    finally { setAddingMember(false); }
  };

  // ========== ADMIN PAYMENT GATEWAY HANDLERS ==========
  const handleSaveBankDetails = async () => {
    if (!selectedGroup) return;
    if (!bankDetails.bankName.trim() || !bankDetails.accountNumber.trim() || !bankDetails.accountHolder.trim()) {
      showAlert('Error', 'Bank name, account number and account holder are required');
      return;
    }
    setSavingBankDetails(true);
    try {
      const res = await axios.put(`${API_URL}/api/payments/groups/${selectedGroup.id}/bank-details`, bankDetails, { headers });
      if (res.data.success) {
        showAlert('Success', 'Bank details updated successfully');
      } else { showAlert('Error', res.data.message || 'Failed to update bank details'); }
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to update bank details'); }
    finally { setSavingBankDetails(false); }
  };



  const handleDeleteGroup = async (group: Group) => {
    const memberCount = group._count?.members || group.memberCount || 0;
    const txCount = group._count?.transactions || 0;
    if (memberCount > 1 || txCount > 0) {
      showAlert(
        'Cannot Delete Group',
        `"${group.name}" has ${memberCount > 1 ? `${memberCount} members` : ''}${memberCount > 1 && txCount > 0 ? ' and ' : ''}${txCount > 0 ? `${txCount} transaction${txCount === 1 ? '' : 's'}` : ''}. Groups with members or contributions can only be removed by the system administrator.`,
      );
      return;
    }
    showAlert('Delete Group', `Are you sure you want to delete "${group.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await axios.delete(`${API_URL}/api/groups/${group.id}`, { headers });
          if (res.data.success) {
            showAlert('Success', res.data.message || 'Group deleted');
            // Group is gone; nothing to go back into. Bounce to the dashboard.
            setGroupView('list'); setSelectedGroup(null);
            fetchDashboardData();
          } else { showAlert('Error', res.data.message || 'Failed to delete group'); }
        } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to delete group'); }
      }},
    ]);
  };

  // ========== JOIN GROUP BY CODE ==========
  const handleJoinByCode = async () => {
    const code = joinGroupCode.trim().toUpperCase();
    if (!code) { showAlert('Error', 'Please enter a group invite code'); return; }
    setJoiningGroup(true);
    try {
      // Look up group by code
      const lookupRes = await axios.get(`${API_URL}/api/groups/code/${code}`, { headers });
      const group = lookupRes.data.data;
      if (!group?.id) { showAlert('Error', 'Group not found. Please check the code and try again.'); return; }
      // Join the group
      const joinRes = await axios.post(`${API_URL}/api/groups/${group.id}/join`, {}, { headers });
      if (joinRes.data.success) {
        showAlert('Success', `You have joined "${group.name}"! 🎉`);
        setShowJoinGroupModal(false);
        setJoinGroupCode('');
        fetchDashboardData();
      } else {
        showAlert('Error', joinRes.data.message || 'Failed to join group');
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to join group. Check the code and try again.';
      showAlert('Error', msg);
    } finally { setJoiningGroup(false); }
  };

  // ========== MEMBER HANDLERS ==========
  const handleMemberPayment = async () => {
    if (!paymentGroup) return;

    // If Ozow is selected, initiate via Ozow gateway
    if (paymentMethod === 'OZOW') {
      setPaying(true);
      try {
        const res = await axios.post(`${API_URL}/api/ozow/initiate`, {
          groupId: paymentGroup.id,
          amount: Number(paymentGroup.contributionAmount),
        }, { headers });
        if (res.data.success && res.data.url) {
          setOzowUrl(res.data.url);
          setOzowPaymentData(res.data.paymentData || {});
          setOzowTransactionId(res.data.transactionId || '');
          setShowPaymentModal(false);
          setShowOzowWebView(true);
        } else {
          showAlert('Error', res.data.message || 'Failed to initiate Ozow payment');
        }
      } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to connect to Ozow'); }
      finally { setPaying(false); }
      return;
    }

    // Standard (non-Ozow) payment
    setPaying(true);
    try {
      const res = await axios.post(`${API_URL}/api/transactions/contribute`, {
        stokvelGroupId: paymentGroup.id, amount: Number(paymentGroup.contributionAmount), paymentMethod, notes: paymentNotes || undefined,
      }, { headers });
      if (res.data.success) {
        showAlert('Success', 'Payment recorded successfully!');
        setShowPaymentModal(false); setPaymentNotes(''); fetchDashboardData();
      } else { showAlert('Error', res.data.message || 'Payment failed'); }
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Payment failed'); }
    finally { setPaying(false); }
  };

  const handleOzowSuccess = (_txId: string) => {
    setShowOzowWebView(false);
    showAlert('Payment Processing', 'Your Ozow payment is being processed. It will reflect in your dashboard shortly.');
    setPaymentNotes('');
    fetchDashboardData();
  };
  const handleOzowError = (_txId: string) => {
    setShowOzowWebView(false);
    showAlert('Payment Failed', 'Your Ozow payment failed. Please try again.');
  };
  const handleOzowCancel = (_txId: string) => {
    setShowOzowWebView(false);
    showAlert('Payment Cancelled', 'You cancelled the payment.');
  };

  const handleRSVP = async (meetingId: string, status: string) => {
    setRsvpingMeetingId(meetingId);
    try {
      await axios.put(`${API_URL}/api/meetings/${meetingId}/rsvp`, { status }, { headers });
      if (memberGroups.length > 0) {
        const gid = memberGroups[selectedMemberGroupIdx]?.id || memberGroups[0].id;
        const res = await axios.get(`${API_URL}/api/meetings/group/${gid}`, { headers });
        const mtgData = res.data.data;
        setMemberMeetings(Array.isArray(mtgData) ? mtgData : (mtgData?.meetings || []));
      }
      showAlert('Success', `RSVP updated to ${status === 'GOING' ? 'Going' : status === 'MAYBE' ? 'Maybe' : 'Not Going'}`);
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to update RSVP'); }
    finally { setRsvpingMeetingId(null); }
  };

  const handleMarkAnnouncementRead = async (id: string) => {
    try {
      await axios.put(`${API_URL}/api/announcements/${id}/read`, {}, { headers });
      // Update local state to reflect read status
      setMemberAnnouncements(prev => prev.map(ann => ann.id === id ? { ...ann, isRead: true } : ann));
    } catch (e) {
      console.error('Mark announcement read error:', e);
    }
  };

  // ========== LOADING ==========
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║                 SUPERADMIN DASHBOARD                        ║
  // ╚══════════════════════════════════════════════════════════════╝
  if (superAdmin) {
    return (
      <ScrollView style={styles.screenContainer} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.xxl, padding: 28, alignItems: 'center', marginBottom: SPACING.lg, width: '100%' }}>
          <View style={{ width: 80, height: 80, borderRadius: RADIUS.xl, backgroundColor: '#DDD6FE', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md }}>
            <Icon name="admin-panel-settings" size={44} color="#7C3AED" />
          </View>
          <Text style={{ fontSize: scaleFontSize(22), fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 8 }}>Web Portal Required</Text>
          <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg }}>
            System administration is only available through the secure web portal. Please log in at the web dashboard.
          </Text>
          <View style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, width: '100%', ...shadow(2, 8, 0.06) }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, textAlign: 'center' }}>admin.estokvel.co.za</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.logoutButtonLarge, { width: '100%' }]} onPress={onLogout}>
          <Icon name="logout" size={20} color={COLORS.error} />
          <Text style={styles.logoutButtonLargeText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Dead code removed — SUPERADMIN mobile dashboard disabled.
  // SUPERADMIN functionality moved to web portal.

  // ╔══════════════════════════════════════════════════════════════╗
  // ║              UNIFIED GROUP DASHBOARD (all non-superadmins)    ║
  // ║                                                                ║
  // ║  One render path for everyone. Per-card actions are gated by   ║
  // ║  roleForGroup(group.id) — never by a global flag.              ║
  // ╚══════════════════════════════════════════════════════════════╝
  {
    // ---------- GROUP SUB-SCREENS (analytics, members, etc.) ----------
    if (groupView === 'ledger' && selectedGroup) {
      return (
        <View style={{ flex: 1 }} {...swipeBack.panHandlers}>
          <LedgerScreen auth={auth} initialGroupId={selectedGroup.id} onBack={() => setGroupView('home')} />
        </View>
      );
    }

    if (groupView !== 'list' && groupView !== 'home' && selectedGroup) {
      // The runtime guard above already narrows out 'list', 'home', and 'ledger'.
      const featureView = groupView as FeatureView;
      return (
        <View style={{ flex: 1 }} {...swipeBack.panHandlers}>
        <ScrollView style={styles.screenContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); openFeature(featureView, selectedGroup); }} colors={[COLORS.primary]} />}>
          {/* Sub-screen Header */}
          <LinearGradient colors={['#0A2463', '#0F3285']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.subScreenHeader, { paddingVertical: SPACING.md, paddingHorizontal: SPACING.md }]}>
            <TouchableOpacity onPress={() => setGroupView('home')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="arrow-back" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{selectedGroup.name}</Text>
            <View style={{ width: 60 }} />
          </LinearGradient>

          {/* Analytics Sub-screen */}
          {groupView === 'analytics' && (
            <View style={{ padding: 16 }}>
              {subScreenLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ color: COLORS.textLight, marginTop: 12, fontSize: 14 }}>Loading analytics...</Text>
                </View>
              ) : (
              <>
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="bar-chart" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Group Analytics</Text>
                </View>
                <View style={styles.financialGrid}>
                  <View style={styles.financialItem}>
                    <Icon name="people" size={24} color={COLORS.primary} />
                    <Text style={styles.financialLabel}>Members</Text>
                    <Text style={styles.financialValue}>{selectedGroup._count?.members || selectedGroup.memberCount || 0}</Text>
                  </View>
                  <View style={styles.financialItem}>
                    <Icon name="account-balance-wallet" size={24} color={COLORS.success} />
                    <Text style={styles.financialLabel}>Collected</Text>
                    <Text style={styles.financialValue}>{formatCurrency(groupTransactions.filter(t => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0))}</Text>
                  </View>
                  <View style={styles.financialItem}>
                    <Icon name="receipt-long" size={24} color={COLORS.member} />
                    <Text style={styles.financialLabel}>Transactions</Text>
                    <Text style={styles.financialValue}>{groupTransactions.length}</Text>
                  </View>
                  <View style={styles.financialItem}>
                    <Icon name="attach-money" size={24} color={COLORS.secondary} />
                    <Text style={styles.financialLabel}>Contribution</Text>
                    <Text style={styles.financialValue}>{formatCurrency(selectedGroup.contributionAmount)}/{selectedGroup.contributionFrequency === 'MONTHLY' ? 'mo' : 'wk'}</Text>
                  </View>
                </View>
              </View>
              {/* Collection Progress */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Collection Rate</Text>
                {(() => {
                  const memberCount = selectedGroup._count?.members || selectedGroup.memberCount || 1;
                  const expected = memberCount * Number(selectedGroup.contributionAmount);
                  const collected = groupTransactions.filter(t => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED').reduce((s, t) => s + Number(t.amount), 0);
                  const rate = expected > 0 ? (collected / expected) * 100 : 0;
                  return (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text allowFontScaling={false} style={{ fontSize: 14, color: COLORS.textLight, flexShrink: 0 }}>This Period</Text>
                        <Text allowFontScaling={false} style={{ fontSize: 14, fontWeight: '700', color: rate >= 80 ? COLORS.success : COLORS.warning, flexShrink: 0 }}>{Math.round(rate)}%</Text>
                      </View>
                      <ProgressBar progress={rate} color={rate >= 80 ? COLORS.success : COLORS.warning} />
                      <Text style={{ fontSize: 12, color: COLORS.textLight, marginTop: 8 }}>
                        {formatCurrency(collected)} collected of {formatCurrency(expected)} expected
                      </Text>
                    </View>
                  );
                })()}
              </View>
              {/* Recent Transactions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                {groupTransactions.slice(0, 10).map(tx => (
                  <View key={tx.id} style={styles.listItem}>
                    <View style={[styles.listItemIcon, { backgroundColor: tx.transactionType === 'CONTRIBUTION' ? COLORS.accentSoft : COLORS.errorSoft }]}>
                      <Icon name="trending-up" size={18} color={tx.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemTitle}>{tx.member?.user?.fullName || 'Member'}</Text>
                      <Text style={styles.listItemSub}>{formatDate(tx.transactionDate)}</Text>
                    </View>
                    <Text style={{ fontWeight: '700', color: tx.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error }}>
                      {tx.transactionType === 'CONTRIBUTION' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>
                  </View>
                ))}
                {groupTransactions.length === 0 && (
                  <View style={styles.emptyStateCard}>
                    <View style={{ width: 64, height: 64, borderRadius: RADIUS.lg, backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                      <Icon name="receipt-long" size={32} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                    <Text style={styles.emptyText}>Transactions will appear here once members contribute</Text>
                  </View>
                )}
              </View>
              </>
              )}
            </View>
          )}

          {/* Announcements Sub-screen */}
          {groupView === 'announcements' && (
            <View style={{ padding: 16 }}>
              {subScreenLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ color: COLORS.textLight, marginTop: 12, fontSize: 14 }}>Loading announcements...</Text>
                </View>
              ) : (
              <>
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="announcement" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Announcements</Text>
                  {/* Create-announcement is admin-only. Backend rejects too
                      (announcement.service.ts:35-40) but we don't want
                      members tapping a button they can't use. */}
                  {selectedGroup && roleForGroup(selectedGroup.id) === 'ADMIN' && (
                    <TouchableOpacity onPress={() => setShowAnnouncementForm(true)} style={styles.addBtnSmall}>
                      <Icon name="add" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>New</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {announcements.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <View style={{ width: 64, height: 64, borderRadius: RADIUS.lg, backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                      <Icon name="announcement" size={32} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyText}>No announcements yet</Text>
                  </View>
                ) : announcements.map(ann => (
                  <View key={ann.id} style={[styles.listItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Text style={[styles.listItemTitle, { flex: 1 }]}>{ann.pinned ? '📌 ' : ''}{ann.title}</Text>
                      {/* Delete is also admin-only. */}
                      {selectedGroup && roleForGroup(selectedGroup.id) === 'ADMIN' && (
                        <TouchableOpacity onPress={() => handleDeleteAnnouncement(ann.id)} disabled={deletingAnnouncementId === ann.id}>
                          {deletingAnnouncementId === ann.id ? <ActivityIndicator size="small" color={COLORS.error} /> : <Icon name="delete" size={18} color={COLORS.error} />}
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: COLORS.textLight, marginTop: 4 }}>{ann.content}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#aaa' }}>{formatDate(ann.createdAt)}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.primary }}>{ann.readCount || 0} seen</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Create Announcement Modal */}
              <Modal visible={showAnnouncementForm} animationType="slide" transparent={false}>
                <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                      <TouchableOpacity onPress={() => setShowAnnouncementForm(false)} style={{ paddingRight: 12 }}>
                        <Icon name="close" size={24} color={COLORS.textLight} />
                      </TouchableOpacity>
                      <Icon name="announcement" size={22} color={COLORS.primary} />
                      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginLeft: 8, flex: 1 }}>New Announcement</Text>
                    </View>
                    <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Title *</Text>
                        <TextInput style={styles.input} value={newAnnTitle} onChangeText={setNewAnnTitle} placeholder="Announcement title" />
                      </View>
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Content *</Text>
                        <TextInput style={[styles.input, { height: 140, textAlignVertical: 'top' }]} value={newAnnContent} onChangeText={setNewAnnContent}
                          placeholder="Write your announcement..." multiline />
                      </View>
                      <TouchableOpacity style={[styles.button, submittingAnnouncement && styles.buttonDisabled, { marginTop: 20 }]} onPress={handleCreateAnnouncement} disabled={submittingAnnouncement}>
                        {submittingAnnouncement ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Post Announcement</Text>}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </KeyboardAvoidingView>
              </Modal>
              </>
              )}
            </View>
          )}

          {/* Meetings Sub-screen */}
          {groupView === 'meetings' && (
            <View style={{ padding: 16 }}>
              {subScreenLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ color: COLORS.textLight, marginTop: 12, fontSize: 14 }}>Loading meetings...</Text>
                </View>
              ) : (
              <>
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="event" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Meetings</Text>
                  {/* Only group admins can schedule meetings; backend gates
                      this too (meeting.service.ts:18). */}
                  {selectedGroup && roleForGroup(selectedGroup.id) === 'ADMIN' && (
                    <TouchableOpacity onPress={() => setShowMeetingForm(true)} style={styles.addBtnSmall}>
                      <Icon name="add" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Schedule</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {meetings.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <View style={{ width: 64, height: 64, borderRadius: RADIUS.lg, backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                      <Icon name="event" size={32} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyText}>No meetings scheduled</Text>
                  </View>
                ) : meetings.map(mtg => (
                  <View key={mtg.id} style={[styles.listItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={styles.listItemTitle}>{mtg.title}</Text>
                    {mtg.description && <Text style={{ fontSize: 13, color: COLORS.textLight, marginTop: 2 }}>{mtg.description}</Text>}
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="today" size={14} color={COLORS.textLight} />
                        <Text style={{ fontSize: 12, color: COLORS.textLight }}>{formatDateTime(mtg.date)}</Text>
                      </View>
                      {mtg.location && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Icon name="location-on" size={14} color={COLORS.textLight} />
                          <Text style={{ fontSize: 12, color: COLORS.textLight }}>{mtg.location}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.success }}>✓ {mtg.goingCount || 0} going</Text>
                      <Text style={{ fontSize: 12, color: COLORS.warning }}>? {mtg.maybeCount || 0} maybe</Text>
                    </View>
                    {mtg.attendees && mtg.attendees.length > 0 && (
                      <View style={{ marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4 }}>RSVPs:</Text>
                        {mtg.attendees.map((a: any, i: number) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 12, color: a.status === 'GOING' ? COLORS.success : COLORS.warning }}>
                              {a.status === 'GOING' ? '✓' : '?'}
                            </Text>
                            <Text style={{ fontSize: 12, color: COLORS.text }}>{a.name}</Text>
                            <Text style={{ fontSize: 11, color: COLORS.textLight }}>({a.status === 'GOING' ? 'Going' : 'Maybe'})</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Schedule Meeting Modal */}
              <Modal visible={showMeetingForm} animationType="slide" transparent={false}>
                <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                      <TouchableOpacity onPress={() => setShowMeetingForm(false)} style={{ paddingRight: 12 }}>
                        <Icon name="close" size={24} color={COLORS.textLight} />
                      </TouchableOpacity>
                      <Icon name="event" size={22} color={COLORS.primary} />
                      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginLeft: 8, flex: 1 }}>Schedule Meeting</Text>
                    </View>
                    <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Title *</Text>
                        <TextInput style={styles.input} value={newMeetTitle} onChangeText={setNewMeetTitle} placeholder="Meeting title" />
                      </View>
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={newMeetDesc} onChangeText={setNewMeetDesc} placeholder="Description..." multiline />
                      </View>

                      {/* Date Picker */}
                      <View style={styles.inputContainer}>
                        <Text style={[styles.label, { marginBottom: 10 }]}>Date *</Text>
                        {/* Day selector */}
                        <Text style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 6 }}>Day</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                            <TouchableOpacity key={d} onPress={() => setMeetDay(d)}
                              style={{ width: 40, height: 40, borderRadius: 20, marginRight: 6, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: meetDay === d ? COLORS.primary : '#F3F4F6', borderWidth: 1, borderColor: meetDay === d ? COLORS.primary : '#E5E7EB' }}>
                              <Text style={{ fontSize: 14, fontWeight: meetDay === d ? '700' : '500', color: meetDay === d ? '#fff' : COLORS.text }}>{d}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {/* Month selector */}
                        <Text style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 6 }}>Month</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                            <TouchableOpacity key={m} onPress={() => setMeetMonth(i)}
                              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 6,
                                backgroundColor: meetMonth === i ? COLORS.primary : '#F3F4F6', borderWidth: 1, borderColor: meetMonth === i ? COLORS.primary : '#E5E7EB' }}>
                              <Text style={{ fontSize: 13, fontWeight: meetMonth === i ? '700' : '500', color: meetMonth === i ? '#fff' : COLORS.text }}>{m}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {/* Year selector */}
                        <Text style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 6 }}>Year</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                          {[new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                            <TouchableOpacity key={y} onPress={() => setMeetYear(y)}
                              style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 16,
                                backgroundColor: meetYear === y ? COLORS.primary : '#F3F4F6', borderWidth: 1, borderColor: meetYear === y ? COLORS.primary : '#E5E7EB' }}>
                              <Text style={{ fontSize: 14, fontWeight: meetYear === y ? '700' : '500', color: meetYear === y ? '#fff' : COLORS.text }}>{y}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Time Picker */}
                      <View style={styles.inputContainer}>
                        <Text style={[styles.label, { marginBottom: 10 }]}>Time *</Text>
                        {/* Hour selector */}
                        <Text style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 6 }}>Hour</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                          {Array.from({ length: 24 }, (_, i) => i).map(h => (
                            <TouchableOpacity key={h} onPress={() => setMeetHour(h)}
                              style={{ width: 42, height: 38, borderRadius: 10, marginRight: 6, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: meetHour === h ? COLORS.primary : '#F3F4F6', borderWidth: 1, borderColor: meetHour === h ? COLORS.primary : '#E5E7EB' }}>
                              <Text style={{ fontSize: 14, fontWeight: meetHour === h ? '700' : '500', color: meetHour === h ? '#fff' : COLORS.text }}>{String(h).padStart(2, '0')}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {/* Minute selector */}
                        <Text style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 6 }}>Minute</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                            <TouchableOpacity key={m} onPress={() => setMeetMinute(m)}
                              style={{ width: 42, height: 38, borderRadius: 10, marginRight: 6, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: meetMinute === m ? COLORS.primary : '#F3F4F6', borderWidth: 1, borderColor: meetMinute === m ? COLORS.primary : '#E5E7EB' }}>
                              <Text style={{ fontSize: 14, fontWeight: meetMinute === m ? '700' : '500', color: meetMinute === m ? '#fff' : COLORS.text }}>{String(m).padStart(2, '0')}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        {/* Preview */}
                        <View style={{ backgroundColor: COLORS.primarySoft, padding: 12, borderRadius: 10, marginTop: 4 }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.primary, textAlign: 'center' }}>
                            {meetDay} {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][meetMonth]} {meetYear} at {String(meetHour).padStart(2, '0')}:{String(meetMinute).padStart(2, '0')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Location (optional)</Text>
                        <TextInput style={styles.input} value={newMeetLocation} onChangeText={setNewMeetLocation} placeholder="Meeting location" />
                      </View>
                      <TouchableOpacity style={[styles.button, submittingMeeting && styles.buttonDisabled, { marginTop: 10, marginBottom: 30 }]} onPress={handleCreateMeeting} disabled={submittingMeeting}>
                        {submittingMeeting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Schedule Meeting</Text>}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </KeyboardAvoidingView>
              </Modal>
              </>
              )}
            </View>
          )}

          {/* Members Sub-screen */}
          {groupView === 'members' && (
            <View style={{ padding: 16 }}>
              {subScreenLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ color: COLORS.textLight, marginTop: 12, fontSize: 14 }}>Loading members...</Text>
                </View>
              ) : (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="people" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Members ({groupMembers.length})</Text>
                  {selectedGroup && roleForGroup(selectedGroup.id) === 'ADMIN' && (
                    <TouchableOpacity onPress={() => { setShowAddMemberModal(true); setAddedMemberPin(''); }} style={styles.addBtnSmall}>
                      <Icon name="person-add" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {groupMembers.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <View style={{ width: 64, height: 64, borderRadius: RADIUS.lg, backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                      <Icon name="people" size={32} color={COLORS.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>No Members Yet</Text>
                    <Text style={styles.emptyText}>Add members using the button above</Text>
                  </View>
                ) : groupMembers.map((m: GroupMember) => (
                  <View key={m.id} style={styles.listItem}>
                    <View style={[styles.listItemIcon, {
                      backgroundColor: m.paymentStatus === 'PAID' ? COLORS.accentSoft : m.paymentStatus === 'PENDING' ? COLORS.warningSoft : COLORS.errorSoft
                    }]}>
                      <Icon name={m.paymentStatus === 'PAID' ? 'check-circle' : m.paymentStatus === 'PENDING' ? 'schedule' : 'warning'}
                        size={18} color={m.paymentStatus === 'PAID' ? COLORS.success : m.paymentStatus === 'PENDING' ? COLORS.warning : COLORS.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemTitle}>{m.user.fullName}</Text>
                      <Text style={styles.listItemSub}>{m.role} · {m.user.phoneNumber}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.paymentStatusLabel, {
                        color: m.paymentStatus === 'PAID' ? COLORS.success : m.paymentStatus === 'PENDING' ? COLORS.warning : COLORS.error
                      }]}>{m.paymentStatus}</Text>
                      {m.lastContributionDate && (
                        <Text style={{ fontSize: 11, color: '#aaa' }}>Last: {formatDate(m.lastContributionDate)}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
              )}
            </View>
          )}

          {/* ====== PAYMENT GATEWAY SUB-SCREEN ====== */}
          {groupView === 'payments' && (
            <ScrollView style={{ padding: 16 }}>
              {subScreenLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ color: COLORS.textLight, marginTop: 12, fontSize: 14 }}>Loading payment details...</Text>
                </View>
              ) : (
              <>
              {/* Bank Details Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="account-balance" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Bank Details</Text>
                </View>
                <Text style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 16 }}>
                  Members will see these details when making payments
                </Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Bank Name *</Text>
                  <TextInput style={styles.input} value={bankDetails.bankName} onChangeText={t => setBankDetails(prev => ({ ...prev, bankName: t }))} placeholder="e.g. FNB, Capitec, Standard Bank" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Account Holder *</Text>
                  <TextInput style={styles.input} value={bankDetails.accountHolder} onChangeText={t => setBankDetails(prev => ({ ...prev, accountHolder: t }))} placeholder="Account holder name" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Account Number *</Text>
                  <TextInput style={styles.input} value={bankDetails.accountNumber} onChangeText={t => setBankDetails(prev => ({ ...prev, accountNumber: t }))} placeholder="Account number" keyboardType="numeric" />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Branch Code</Text>
                  <TextInput style={styles.input} value={bankDetails.branchCode} onChangeText={t => setBankDetails(prev => ({ ...prev, branchCode: t }))} placeholder="Branch code (optional)" keyboardType="numeric" />
                </View>
                <TouchableOpacity style={[styles.button, savingBankDetails && styles.buttonDisabled]} onPress={handleSaveBankDetails} disabled={savingBankDetails}>
                  {savingBankDetails ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Bank Details</Text>}
                </TouchableOpacity>
              </View>

              <View style={{ height: 20 }} />
              </>
              )}
            </ScrollView>
          )}

          {/* Add Member Modal */}
          <Modal visible={showAddMemberModal} animationType="slide" transparent={false}>
            <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <TouchableOpacity onPress={() => { setShowAddMemberModal(false); setAddedMemberPin(''); }} style={{ paddingRight: 12 }}>
                    <Icon name="close" size={24} color={COLORS.textLight} />
                  </TouchableOpacity>
                  <Icon name="person-add" size={22} color={COLORS.primary} />
                  <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginLeft: 8, flex: 1 }}>Add Member</Text>
                </View>
                <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
                {selectedGroup && (
                  <View style={{ backgroundColor: COLORS.primarySoft, padding: 12, borderRadius: 10, marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: '600' }}>Group: {selectedGroup.name}</Text>
                  </View>
                )}
                {addedMemberSuccess ? (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Icon name="check-circle" size={48} color={COLORS.success} />
                    <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 12, color: COLORS.text }}>Member Added!</Text>
                    {addedMemberPin ? (
                      <>
                        <Text style={{ fontSize: 14, color: COLORS.textLight, marginTop: 4, textAlign: 'center' }}>Share this temporary PIN with the new member</Text>
                        <View style={{ backgroundColor: COLORS.warningSoft, padding: 16, borderRadius: 12, marginTop: 16, width: '100%' }}>
                          <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.warning, letterSpacing: 8, textAlign: 'center' }}>{addedMemberPin}</Text>
                        </View>
                        <Text style={{ fontSize: 12, color: COLORS.error, marginTop: 8 }}>They must change this PIN on first login</Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
                        This person already has an eStokvel account — they can log in with their existing PIN.
                      </Text>
                    )}
                    <TouchableOpacity style={[styles.button, { marginTop: 20, width: '100%' }]} onPress={() => { setShowAddMemberModal(false); setAddedMemberPin(''); setAddedMemberSuccess(false); }}>
                      <Text style={styles.buttonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>First Name *</Text>
                      <TextInput style={styles.input} value={newMemberFirstName} onChangeText={setNewMemberFirstName} placeholder="Enter first name" />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Last Name *</Text>
                      <TextInput style={styles.input} value={newMemberLastName} onChangeText={setNewMemberLastName} placeholder="Enter last name" />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Phone Number *</Text>
                      <TextInput style={styles.input} value={newMemberPhone} onChangeText={setNewMemberPhone} placeholder="e.g. 0831234567" keyboardType="phone-pad" maxLength={10} />
                    </View>
                    <TouchableOpacity style={[styles.button, addingMember && { opacity: 0.7 }, { marginTop: 20 }]} onPress={handleAddMember} disabled={addingMember}>
                      <Text style={styles.buttonText}>{addingMember ? 'Adding...' : 'Add Member'}</Text>
                    </TouchableOpacity>
                  </>
                )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </ScrollView>
        </View>
      );
    }

    // ---------- GROUP HOME ----------
    // The middle level of the navigation. User has entered a specific group's
    // context. Everything on this screen — the role badge, the tile grid, the
    // admin-only tools — is keyed off THIS group, never a global flag.
    if (groupView === 'home' && selectedGroup) {
      const homeRole = roleForGroup(selectedGroup.id);
      const homeIsAdmin = homeRole === 'ADMIN';
      const homeMemberCount = selectedGroup._count?.members || selectedGroup.memberCount || 0;

      // Tile definition kept inline so adding/removing/reordering features is
      // a single-spot edit. `adminOnly: true` hides the tile from members —
      // the backend will also reject if it's bypassed, but we don't tease
      // members with buttons they can't use.
      // Tile order is deliberate. Common (visible to all members) → admin-only.
      // 6 tiles for a member, 7 for an admin. Both fit a 2-column grid cleanly
      // (6 = 3 rows, neat; 7 = 3 rows + 1 admin-only tile, also acceptable).
      const tiles: { key: string; icon: IconName; label: string; sub: string; adminOnly?: boolean; onPress: () => void }[] = [
        {
          key: 'analytics', icon: 'bar-chart', label: 'Analytics', sub: 'Group financials',
          onPress: () => openFeature('analytics', selectedGroup),
        },
        {
          key: 'ledger', icon: 'menu-book', label: 'Ledger', sub: 'Every transaction',
          onPress: () => setGroupView('ledger'),
        },
        {
          key: 'members', icon: 'people', label: 'Members', sub: `${homeMemberCount} ${homeMemberCount === 1 ? 'person' : 'people'}`,
          onPress: () => openFeature('members', selectedGroup),
        },
        {
          key: 'announcements', icon: 'announcement', label: 'Announcements', sub: 'Group updates',
          onPress: () => openFeature('announcements', selectedGroup),
        },
        {
          key: 'meetings', icon: 'event', label: 'Meetings', sub: 'Schedule + RSVP',
          onPress: () => openFeature('meetings', selectedGroup),
        },
        {
          key: 'chat', icon: 'chat-bubble', label: 'Chat', sub: 'Group discussion',
          onPress: () => onNavigateTab('chat', selectedGroup.id),
        },
        {
          key: 'payments', icon: 'payments', label: 'Bank Details', sub: 'Where payments go',
          adminOnly: true,
          onPress: () => openFeature('payments', selectedGroup),
        },
      ];
      const visibleTiles = tiles.filter(t => !t.adminOnly || homeIsAdmin);

      return (
        <View style={{ flex: 1 }} {...swipeBack.panHandlers}>
        <ScrollView
          style={styles.screenContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {/* Header with back arrow, group name, role banner */}
          <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: SPACING.md, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg, borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}>
              <TouchableOpacity
                onPress={() => { setGroupView('list'); setSelectedGroup(null); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                accessibilityLabel="Back to all groups"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="arrow-back" size={24} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>All groups</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#fff', fontSize: scaleFontSize(24), fontWeight: '800' }} numberOfLines={2}>
              {selectedGroup.name}
            </Text>
            {selectedGroup.description ? (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                {selectedGroup.description}
              </Text>
            ) : null}

            {/* Per-group role banner. The whole point of the redesign — the
                user sees clearly that they hold a SPECIFIC role in this
                SPECIFIC group, separate from anywhere else. */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
              backgroundColor: homeIsAdmin ? 'rgba(255,255,255,0.2)' : 'rgba(74,222,128,0.25)',
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
              marginTop: 12, gap: 6,
            }}>
              <Icon name={homeIsAdmin ? 'star' : 'person'} size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 }}>
                You are {homeIsAdmin ? 'ADMIN' : 'a MEMBER'} of this group
              </Text>
            </View>

            {/* Quick stats. Same as on the card but bigger — sets context. */}
            <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, padding: SPACING.sm }}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500' }}>Contribution</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 }}>
                  {formatCurrency(selectedGroup.contributionAmount)}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 1 }}>
                  /{selectedGroup.contributionFrequency === 'MONTHLY' ? 'month' : 'week'}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, padding: SPACING.sm }}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500' }}>Members</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 }}>{homeMemberCount}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, padding: SPACING.sm }}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500' }}>Plan</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                  {(selectedGroup as any).payoutModel === 'END_OF_TERM' ? 'Savings' : 'Rotating'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Pay CTA — admin and member both contribute. This is intentionally
              the most prominent action on the screen because for the typical
              user, "pay my monthly" is the #1 reason they opened the group. */}
          <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.md }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
                paddingVertical: 14, ...shadow(2, 8, 0.12),
              }}
              onPress={() => {
                setPaymentGroup(selectedGroup);
                setPaymentMethod('EFT');
                setPaymentNotes('');
                setShowPaymentModal(true);
              }}
              accessibilityLabel={`Pay ${formatCurrency(selectedGroup.contributionAmount)}`}
              accessibilityRole="button"
            >
              <Icon name="payments" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                Pay {formatCurrency(selectedGroup.contributionAmount)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feature tile grid — 2 columns. Tiles filtered by role before
              render, so a member literally cannot tap admin-only tiles. If
              the visible count is odd, the last tile spans full-width so we
              don't leave an awkward half-width orphan on the bottom row. */}
          <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.lg }}>
            <Text style={{
              fontSize: 12, fontWeight: '700', color: COLORS.textLight,
              letterSpacing: 0.5, marginBottom: SPACING.sm, marginLeft: 4,
            }}>
              FEATURES
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {visibleTiles.map((tile, idx) => {
                const isOrphan = idx === visibleTiles.length - 1 && visibleTiles.length % 2 === 1;
                return (
                <TouchableOpacity
                  key={tile.key}
                  onPress={tile.onPress}
                  style={{
                    flexBasis: isOrphan ? '100%' : '48%',
                    flexGrow: 1,
                    backgroundColor: '#fff',
                    borderRadius: RADIUS.lg,
                    padding: SPACING.md,
                    ...shadow(1, 6, 0.04),
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={tile.label}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: RADIUS.sm,
                    backgroundColor: COLORS.primarySoft,
                    justifyContent: 'center', alignItems: 'center',
                    marginBottom: SPACING.sm,
                  }}>
                    <Icon name={tile.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>{tile.label}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }} numberOfLines={1}>
                    {tile.sub}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Admin-only danger zone — destructive action lives at the bottom,
              never as a tile. Members never see this section at all. */}
          {homeIsAdmin && (
            <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.xl, paddingBottom: SPACING.lg }}>
              <Text style={{
                fontSize: 12, fontWeight: '700', color: COLORS.textLight,
                letterSpacing: 0.5, marginBottom: SPACING.sm, marginLeft: 4,
              }}>
                ADMIN TOOLS
              </Text>
              <TouchableOpacity
                onPress={() => handleDeleteGroup(selectedGroup)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, backgroundColor: COLORS.errorSoft,
                  borderRadius: RADIUS.md, paddingVertical: 12,
                  borderWidth: 1, borderColor: COLORS.errorSoft,
                }}
                accessibilityRole="button"
                accessibilityLabel="Delete this group"
              >
                <Icon name="delete" size={16} color={COLORS.error} />
                <Text style={{ color: COLORS.error, fontSize: 13, fontWeight: '700' }}>Delete Group</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
        </View>
      );
    }

    // ---------- DASHBOARD LIST (default) ----------
    return (
      <>
        <ScrollView style={styles.screenContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
          {/* Header */}
          <LinearGradient colors={['#0A2463', '#0F3285', '#1A43A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: 20, paddingBottom: 32, paddingHorizontal: 20, borderBottomLeftRadius: RADIUS.xxl, borderBottomRightRadius: RADIUS.xxl }}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Icon name="person" size={28} color="#fff" />
                </View>
                <View>
                  <Text style={styles.greeting}>Welcome back,</Text>
                  <Text style={styles.userName}>{auth.user?.firstName || auth.user?.fullName?.split(' ')[0] || 'There'}</Text>
                </View>
              </View>
              {/* Header summary — a neutral count, not a global role. Role
                  is per-group; the badge on each card is the source of truth.
                  Showing "GROUP ADMIN" here was misleading for users who are
                  admin in one group and member in another. */}
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Icon name="groups" size={11} color="#fff" />
                  <Text style={styles.roleBadgeText} numberOfLines={1}>
                    {groups.length} {groups.length === 1 ? 'GROUP' : 'GROUPS'}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Your Groups */}
          <View style={styles.cardElevated}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="groups" size={20} color={COLORS.primary} />
              <Text style={styles.sectionHeaderTitle}>YOUR GROUPS ({groups.length})</Text>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(true)} style={styles.addBtnSmall}>
                <Icon name="add" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>New</Text>
              </TouchableOpacity>
            </View>
          </View>

          {groups.length === 0 ? (
            <View style={[styles.emptyStateCard, { margin: 16 }]}>
              <View style={{ width: 72, height: 72, borderRadius: RADIUS.xl, backgroundColor: COLORS.primarySoft, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Icon name="groups" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Groups Yet</Text>
              <Text style={styles.emptyText}>Create a stokvel group to get started</Text>
            </View>
          ) : groups.map(group => {
            const memberCount = group._count?.members || group.memberCount || 0;
            const txCount = group._count?.transactions || 0;
            const cardRole = roleForGroup(group.id);
            const cardIsAdmin = cardRole === 'ADMIN';
            return (
              // Whole card is the tap target. Tapping enters group context.
              // What the user can do INSIDE that group is decided there, not
              // by which buttons we render on the card.
              <TouchableOpacity
                key={group.id}
                activeOpacity={0.7}
                style={styles.groupCardAdmin}
                onPress={() => openGroupHome(group)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${group.name}. You are ${cardRole.toLowerCase()} of this group.`}
              >
                <View style={styles.groupCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={[styles.groupIconBg, { backgroundColor: COLORS.primarySoft }]}>
                      <Icon name="account-balance" size={22} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.groupCardName} numberOfLines={1} ellipsizeMode="tail">{group.name}</Text>
                      <Text style={styles.groupCardSub} numberOfLines={1}>
                        {formatCurrency(group.contributionAmount)}/{group.contributionFrequency === 'MONTHLY' ? 'month' : 'week'}
                      </Text>
                    </View>
                  </View>
                  {/* Per-group role badge — role is specific to THIS group */}
                  <View style={{
                    backgroundColor: cardIsAdmin ? COLORS.primarySoft : COLORS.accentSoft,
                    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
                    flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0,
                  }}
                  accessibilityLabel={cardIsAdmin ? `You are admin of ${group.name}` : `You are a member of ${group.name}`}>
                    <Icon name={cardIsAdmin ? 'star' : 'person'} size={11} color={cardIsAdmin ? COLORS.primary : COLORS.success} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: cardIsAdmin ? COLORS.primary : COLORS.success }}>
                      {cardIsAdmin ? 'ADMIN' : 'MEMBER'}
                    </Text>
                  </View>
                </View>

                {/* Payout Model Badge */}
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <View style={{ backgroundColor: (group as any).payoutModel === 'END_OF_TERM' ? COLORS.warningSoft : COLORS.successSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: (group as any).payoutModel === 'END_OF_TERM' ? '#92400E' : '#065F46' }}>
                      {(group as any).payoutModel === 'END_OF_TERM' ? 'Savings (End-of-Term)' : 'Rotating'}
                    </Text>
                  </View>
                </View>

                {/* Stats Row. Two stats, not three — the third "Since" column
                    was forcing the date value to fight for width against the
                    "Members" / "Transactions" labels, which clipped on narrow
                    phones ("Member" / "Sinc"). The creation date isn't
                    load-bearing on a card; the group-home shows it if needed. */}
                {/* Stats: count + short label. allowFontScaling={false} and a
                    relative fontSize stop OS-level "Larger Text" settings from
                    blowing the label past the column width and clipping it. */}
                <View style={{ flexDirection: 'row', marginVertical: 12 }}>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.primary }}>{memberCount}</Text>
                    <Text allowFontScaling={false} style={{ fontSize: 11, color: COLORS.textLight, textAlign: 'center' }}>
                      {memberCount === 1 ? 'Member' : 'Members'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.success }}>{txCount}</Text>
                    <Text allowFontScaling={false} style={{ fontSize: 11, color: COLORS.textLight, textAlign: 'center' }}>
                      {txCount === 1 ? 'Transaction' : 'Transactions'}
                    </Text>
                  </View>
                </View>

                {/* Tap hint — tells the user the card itself is interactive */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: COLORS.textLight, fontWeight: '500' }}>Open group</Text>
                  <Icon name="chevron-right" size={16} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Create Group Modal */}
        <Modal visible={showCreateGroupModal} animationType="slide" transparent={false}>
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <TouchableOpacity onPress={() => setShowCreateGroupModal(false)} style={{ paddingRight: 12 }}>
                  <Icon name="close" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
                <Icon name="group-add" size={22} color={COLORS.primary} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginLeft: 8, flex: 1 }}>Create New Group</Text>
              </View>
              <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Group Name *</Text>
                <TextInput style={styles.input} value={newGroupName} onChangeText={setNewGroupName} placeholder="e.g., Family Stokvel" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={newGroupDesc} onChangeText={setNewGroupDesc} placeholder="Brief description..." multiline />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Contribution Amount (R) *</Text>
                <TextInput style={styles.input} value={newGroupAmount} onChangeText={setNewGroupAmount} placeholder="500" keyboardType="numeric" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.frequencyRow}>
                  {['WEEKLY', 'MONTHLY'].map(f => (
                    <TouchableOpacity key={f} style={[styles.frequencyBtn, newGroupFreq === f && styles.frequencyBtnActive]}
                      onPress={() => setNewGroupFreq(f)}>
                      <Text style={[styles.frequencyBtnText, newGroupFreq === f && styles.frequencyBtnTextActive]}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Payout Model</Text>
                <View style={styles.frequencyRow}>
                  {([['ROTATING', 'Rotating'], ['END_OF_TERM', 'End-of-Term']] as const).map(([val, label]) => (
                    <TouchableOpacity key={val} style={[styles.frequencyBtn, { flex: 1 }, newGroupPayoutModel === val && styles.frequencyBtnActive]}
                      onPress={() => setNewGroupPayoutModel(val)}>
                      <Text style={[styles.frequencyBtnText, newGroupPayoutModel === val && styles.frequencyBtnTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                  {newGroupPayoutModel === 'ROTATING'
                    ? 'One member receives the full pool each cycle (round-robin).'
                    : 'All members get back their total contributions at end of term (savings).'}
                </Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Duration (months)</Text>
                <View style={styles.frequencyRow}>
                  {['3', '6', '12', '24'].map(d => (
                    <TouchableOpacity key={d} style={[styles.frequencyBtn, newGroupDuration === d && styles.frequencyBtnActive]}
                      onPress={() => setNewGroupDuration(d)}>
                      <Text style={[styles.frequencyBtnText, newGroupDuration === d && styles.frequencyBtnTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.modalButtons, { marginBottom: 30 }]}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateGroupModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, creatingGroup && styles.buttonDisabled]} onPress={handleCreateGroup} disabled={creatingGroup}>
                  {creatingGroup ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create</Text>}
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Admin Payment Modal */}
        <PaymentModal
          visible={showPaymentModal}
          groupName={paymentGroup?.name}
          contributionAmount={paymentGroup?.contributionAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentNotes={paymentNotes}
          setPaymentNotes={setPaymentNotes}
          paying={paying}
          onConfirm={handleMemberPayment}
          onClose={() => setShowPaymentModal(false)}
          formatCurrency={formatCurrency}
        />

        {/* Ozow Payment WebView */}
        <OzowPaymentWebView
          visible={showOzowWebView}
          ozowUrl={ozowUrl}
          paymentData={ozowPaymentData}
          transactionId={ozowTransactionId}
          amount={paymentGroup ? Number(paymentGroup.contributionAmount) : 0}
          groupName={paymentGroup?.name || ''}
          onSuccess={handleOzowSuccess}
          onError={handleOzowError}
          onCancel={handleOzowCancel}
          onClose={() => setShowOzowWebView(false)}
          apiUrl={API_URL}
        />

        {/* Join Group by Code Modal */}
        <Modal visible={showJoinGroupModal} transparent={false} animationType="slide" onRequestClose={() => setShowJoinGroupModal(false)}>
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                <TouchableOpacity onPress={() => setShowJoinGroupModal(false)} style={{ paddingRight: 12 }}>
                  <Icon name="close" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 }}>Join a Stokvel</Text>
              </View>
              <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
                <Text style={{ color: COLORS.textLight, fontSize: 14, marginBottom: 20, lineHeight: 21 }}>
                  Enter the invite code shared by your group admin to join their stokvel.
                </Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Invite Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. ABC123"
                    value={joinGroupCode}
                    onChangeText={setJoinGroupCode}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    accessibilityLabel="Group invite code"
                  />
                </View>
                <View style={[styles.modalButtons, { marginTop: 20 }]}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowJoinGroupModal(false)}>
                    <Text style={{ color: COLORS.textLight, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1, opacity: joiningGroup ? 0.6 : 1 }]}
                    onPress={handleJoinByCode}
                    disabled={joiningGroup}
                    accessibilityLabel="Join group" accessibilityRole="button"
                  >
                    {joiningGroup ? <ActivityIndicator size="small" color="#fff" /> : (
                      <Text style={styles.primaryButtonText}>Join Group</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </>
    );
  }

  // Fallback — unreachable because the block above always returns. Kept only
  // to satisfy TypeScript's "function must return" check.
  return null;
};
