import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { showAlert } from '../utils/alert';
import { API_URL } from '../constants/config';
import { COLORS } from '../constants/theme';
import { styles } from '../styles';
import { AuthState, Group, Transaction, GroupMember, Announcement, Meeting } from '../types';

interface DashboardScreenProps {
  auth: AuthState;
  onLogout: () => void;
  onNavigateTab: (tab: string, groupId?: string) => void;
}

export const DashboardScreen = ({ auth, onLogout, onNavigateTab }: DashboardScreenProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const userRole = auth.user?.role || 'MEMBER';
  const isSuperAdmin = userRole === 'SUPERADMIN';
  const isAdmin = userRole === 'ADMIN';
  const headers = { Authorization: `Bearer ${auth.token}` };
  const formatCurrency = (amount: number | string) => `R ${Number(amount || 0).toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA');
  const formatDateTime = (date: string) => new Date(date).toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ---- SUPERADMIN STATE ----
  const [systemOverview, setSystemOverview] = useState({ admins: 0, groups: 0, members: 0, totalCollected: 0, totalTransactions: 0 });
  const [adminList, setAdminList] = useState<any[]>([]);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [createdAdminPin, setCreatedAdminPin] = useState('');

  // ---- ADMIN STATE ----
  const [groups, setGroups] = useState<Group[]>([]);
  const [adminView, setAdminView] = useState<'main' | 'analytics' | 'announcements' | 'meetings' | 'members'>('main');
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
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupAmount, setNewGroupAmount] = useState('');
  const [newGroupFreq, setNewGroupFreq] = useState('MONTHLY');
  const [newGroupDuration, setNewGroupDuration] = useState('12');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // ---- ADMIN ADD MEMBER STATE ----
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addedMemberPin, setAddedMemberPin] = useState('');

  // ---- MEMBER STATE ----
  const [memberGroups, setMemberGroups] = useState<Group[]>([]);
  const [selectedMemberGroupIdx, setSelectedMemberGroupIdx] = useState(0);
  const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
  const [memberAnnouncements, setMemberAnnouncements] = useState<Announcement[]>([]);
  const [memberMeetings, setMemberMeetings] = useState<Meeting[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentGroup, setPaymentGroup] = useState<Group | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // ========== FETCH DATA ==========
  const fetchDashboardData = useCallback(async () => {
    try {
      const h = { Authorization: `Bearer ${auth.token}` };
      if (isSuperAdmin) {
        const [overviewRes, adminsRes] = await Promise.all([
          axios.get(`${API_URL}/api/auth/system/overview`, { headers: h }).catch(() => ({ data: { data: {} } })),
          axios.get(`${API_URL}/api/auth/admin/list`, { headers: h }).catch(() => ({ data: { data: { admins: [] } } })),
        ]);
        setSystemOverview(overviewRes.data.data || { admins: 0, groups: 0, members: 0, totalCollected: 0, totalTransactions: 0 });
        setAdminList(adminsRes.data.data?.admins || []);
      } else if (isAdmin) {
        const groupsRes = await axios.get(`${API_URL}/api/groups`, { headers: h }).catch(() => ({ data: { data: [] } }));
        setGroups(groupsRes.data.data || []);
      } else {
        const [groupsRes, transRes] = await Promise.all([
          axios.get(`${API_URL}/api/groups`, { headers: h }).catch(() => ({ data: { data: [] } })),
          axios.get(`${API_URL}/api/transactions/my`, { headers: h }).catch(() => ({ data: { data: { transactions: [] } } })),
        ]);
        const grps = groupsRes.data.data || [];
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
      }
    } catch (error) { console.error('Dashboard fetch error:', error); }
    finally { setLoading(false); setRefreshing(false); }
  }, [auth.token, isSuperAdmin, isAdmin, selectedMemberGroupIdx]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  // ========== SUPERADMIN HANDLERS ==========
  const handleCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminPhone.trim()) { showAlert('Error', 'Please enter both name and phone number'); return; }
    if (!/^0\d{9}$/.test(newAdminPhone.trim())) { showAlert('Error', 'Phone must be 10 digits starting with 0'); return; }
    setCreatingAdmin(true); setCreatedAdminPin('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/admin/create`, { fullName: newAdminName.trim(), phoneNumber: newAdminPhone.trim() }, { headers });
      if (res.data.success) { setCreatedAdminPin(res.data.data?.tempPin || ''); setNewAdminName(''); setNewAdminPhone(''); fetchDashboardData(); }
      else { showAlert('Error', res.data.message || 'Failed'); }
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
    finally { setCreatingAdmin(false); }
  };

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    showAlert('Delete Admin', `Are you sure you want to remove "${adminName}" from the system? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await axios.delete(`${API_URL}/api/auth/admin/${adminId}`, { headers });
          if (res.data.success) {
            showAlert('Success', res.data.message || 'Admin removed');
            fetchDashboardData();
          } else { showAlert('Error', res.data.message || 'Failed to delete admin'); }
        } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to delete admin'); }
      }},
    ]);
  };

  // ========== ADMIN HANDLERS ==========
  const openAdminSubScreen = async (view: typeof adminView, group: Group) => {
    setSelectedGroup(group); setAdminView(view);
    const h = { Authorization: `Bearer ${auth.token}` };
    try {
      if (view === 'members') {
        const res = await axios.get(`${API_URL}/api/groups/${group.id}/members`, { headers: h });
        setGroupMembers(res.data.data || []);
      } else if (view === 'announcements') {
        const res = await axios.get(`${API_URL}/api/announcements/group/${group.id}`, { headers: h });
        setAnnouncements(res.data.data?.announcements || []);
      } else if (view === 'meetings') {
        const res = await axios.get(`${API_URL}/api/meetings/group/${group.id}`, { headers: h });
        setMeetings(res.data.data?.meetings || []);
      } else if (view === 'analytics') {
        const transRes = await axios.get(`${API_URL}/api/transactions?stokvelGroupId=${group.id}`, { headers: h }).catch(() => ({ data: { data: { transactions: [] } } }));
        const td = transRes.data.data;
        const allTx = Array.isArray(td) ? td : (td?.transactions || []);
        setGroupTransactions(allTx);
      }
    } catch (e) { console.error('Sub-screen fetch error:', e); }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle.trim() || !newAnnContent.trim() || !selectedGroup) return;
    try {
      await axios.post(`${API_URL}/api/announcements`, { title: newAnnTitle.trim(), content: newAnnContent.trim(), groupId: selectedGroup.id }, { headers });
      setNewAnnTitle(''); setNewAnnContent(''); setShowAnnouncementForm(false);
      const res = await axios.get(`${API_URL}/api/announcements/group/${selectedGroup.id}`, { headers });
      setAnnouncements(res.data.data?.announcements || []);
      showAlert('Success', 'Announcement posted!');
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/api/announcements/${id}`, { headers });
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
  };

  const handleCreateMeeting = async () => {
    if (!newMeetTitle.trim() || !newMeetDate.trim() || !selectedGroup) { showAlert('Error', 'Title and date are required'); return; }
    try {
      await axios.post(`${API_URL}/api/meetings`, {
        title: newMeetTitle.trim(), description: newMeetDesc.trim() || undefined,
        date: new Date(newMeetDate).toISOString(), location: newMeetLocation.trim() || undefined, groupId: selectedGroup.id,
      }, { headers });
      setNewMeetTitle(''); setNewMeetDesc(''); setNewMeetDate(''); setNewMeetLocation(''); setShowMeetingForm(false);
      const res = await axios.get(`${API_URL}/api/meetings/group/${selectedGroup.id}`, { headers });
      setMeetings(res.data.data?.meetings || []);
      showAlert('Success', 'Meeting scheduled!');
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupAmount.trim()) { showAlert('Error', 'Name and amount are required'); return; }
    setCreatingGroup(true);
    try {
      await axios.post(`${API_URL}/api/groups`, {
        name: newGroupName.trim(), description: newGroupDesc.trim() || undefined,
        contributionAmount: parseFloat(newGroupAmount), contributionFrequency: newGroupFreq,
        durationMonths: parseInt(newGroupDuration) || 12,
      }, { headers });
      setNewGroupName(''); setNewGroupDesc(''); setNewGroupAmount(''); setNewGroupDuration('12'); setShowCreateGroupModal(false);
      fetchDashboardData();
      showAlert('Success', 'Group created!');
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
    finally { setCreatingGroup(false); }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberPhone.trim()) { showAlert('Error', 'Please enter both name and phone number'); return; }
    if (!/^0\d{9}$/.test(newMemberPhone.trim())) { showAlert('Error', 'Phone must be 10 digits starting with 0'); return; }
    if (!selectedGroup) { showAlert('Error', 'No group selected'); return; }
    setAddingMember(true); setAddedMemberPin('');
    try {
      const res = await axios.post(`${API_URL}/api/auth/member/add`, {
        fullName: newMemberName.trim(), phoneNumber: newMemberPhone.trim(), groupId: selectedGroup.id,
      }, { headers });
      if (res.data.success) {
        setAddedMemberPin(res.data.data?.tempPin || '');
        setNewMemberName(''); setNewMemberPhone('');
        // Refresh members list
        const membersRes = await axios.get(`${API_URL}/api/groups/${selectedGroup.id}/members`, { headers });
        setGroupMembers(membersRes.data.data || []);
      } else { showAlert('Error', res.data.message || 'Failed to add member'); }
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed to add member'); }
    finally { setAddingMember(false); }
  };

  // ========== MEMBER HANDLERS ==========
  const handleMemberPayment = async () => {
    if (!paymentGroup) return;
    setPaying(true);
    try {
      const res = await axios.post(`${API_URL}/api/transactions/contribute`, {
        stokvelGroupId: paymentGroup.id, amount: paymentGroup.contributionAmount, paymentMethod, notes: paymentNotes || undefined,
      }, { headers });
      if (res.data.success) {
        showAlert('Success', 'Payment recorded successfully!');
        setShowPaymentModal(false); setPaymentNotes(''); fetchDashboardData();
      } else { showAlert('Error', res.data.message || 'Payment failed'); }
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Payment failed'); }
    finally { setPaying(false); }
  };

  const handleRSVP = async (meetingId: string, status: string) => {
    try {
      await axios.put(`${API_URL}/api/meetings/${meetingId}/rsvp`, { status }, { headers });
      if (memberGroups.length > 0) {
        const gid = memberGroups[selectedMemberGroupIdx]?.id || memberGroups[0].id;
        const res = await axios.get(`${API_URL}/api/meetings/group/${gid}`, { headers });
        setMemberMeetings(res.data.data?.meetings || []);
      }
    } catch (e: any) { showAlert('Error', e.response?.data?.message || 'Failed'); }
  };

  const handleMarkAnnouncementRead = async (id: string) => {
    try {
      await axios.put(`${API_URL}/api/announcements/${id}/read`, {}, { headers });
    } catch (e) { /* silent */ }
  };

  // ========== LOADING ==========
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║                 SUPERADMIN DASHBOARD                        ║
  // ╚══════════════════════════════════════════════════════════════╝
  if (isSuperAdmin) {
    return (
      <ScrollView style={styles.screenContainer} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ backgroundColor: '#F3E5F5', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24 }}>
          <Icon name="admin-panel-settings" size={64} color="#9C27B0" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 8 }}>Web Portal Required</Text>
        <Text style={{ fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
          System administration is only available through the secure web portal. Please log in at the web dashboard to manage admins, groups, and system settings.
        </Text>
        <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, width: '100%', marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary, textAlign: 'center' }}>admin.estokvel.co.za</Text>
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
  if (false) {
    return (
      <>
        <ScrollView style={styles.screenContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
          {/* Header */}
          <View style={[styles.dashboardHeader, { backgroundColor: '#9C27B0' }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Icon name="admin-panel-settings" size={28} color="#fff" />
                </View>
                <View>
                  <Text style={styles.greeting}>System Administrator</Text>
                  <Text style={styles.userName}>{auth.user?.fullName?.split(' ')[0] || 'Admin'}</Text>
                </View>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.roleBadgeText}>SUPERADMIN</Text>
              </View>
            </View>
          </View>

          {/* System Overview */}
          <View style={styles.cardElevated}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="dashboard" size={20} color="#9C27B0" />
              <Text style={styles.sectionHeaderTitle}>System Overview</Text>
            </View>
            <View style={styles.financialGrid}>
              <View style={styles.financialItem}>
                <Icon name="admin-panel-settings" size={28} color="#9C27B0" />
                <Text style={styles.financialLabel}>Admins</Text>
                <Text style={styles.financialValue}>{systemOverview.admins}</Text>
              </View>
              <View style={styles.financialItem}>
                <Icon name="groups" size={28} color={COLORS.primary} />
                <Text style={styles.financialLabel}>Groups</Text>
                <Text style={styles.financialValue}>{systemOverview.groups}</Text>
              </View>
              <View style={styles.financialItem}>
                <Icon name="people" size={28} color={COLORS.member} />
                <Text style={styles.financialLabel}>Members</Text>
                <Text style={styles.financialValue}>{systemOverview.members}</Text>
              </View>
              <View style={styles.financialItem}>
                <Icon name="account-balance-wallet" size={28} color={COLORS.success} />
                <Text style={styles.financialLabel}>Total Collected</Text>
                <Text style={styles.financialValue}>{formatCurrency(systemOverview.totalCollected)}</Text>
              </View>
              <View style={styles.financialItem}>
                <Icon name="people" size={28} color={COLORS.secondary} />
                <Text style={styles.financialLabel}>Avg Group Size</Text>
                <Text style={styles.financialValue}>{systemOverview.groups > 0 ? Math.round(systemOverview.members / systemOverview.groups) : 0}</Text>
              </View>
              <View style={styles.financialItem}>
                <Icon name="receipt-long" size={28} color={COLORS.warning} />
                <Text style={styles.financialLabel}>Transactions</Text>
                <Text style={styles.financialValue}>{systemOverview.totalTransactions}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.cardElevated}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="flash-on" size={20} color="#9C27B0" />
              <Text style={styles.sectionHeaderTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => { setCreatedAdminPin(''); setShowCreateAdminModal(true); }}>
                <View style={[styles.quickActionIconBg, { backgroundColor: '#F3E5F5' }]}>
                  <Icon name="person-add" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.quickActionText}>New{"\n"}Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={fetchDashboardData}>
                <View style={[styles.quickActionIconBg, { backgroundColor: '#E3F2FD' }]}>
                  <Icon name="refresh" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.quickActionText}>Refresh{"\n"}Data</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Registered Admins */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="supervisor-account" size={20} color="#9C27B0" />
              <Text style={styles.sectionTitle}>Registered Admins ({adminList.length})</Text>
            </View>
            {adminList.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Icon name="person-add" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No admins created yet</Text>
              </View>
            ) : adminList.map((admin: any) => (
              <View key={admin.id} style={styles.listItem}>
                <View style={[styles.listItemIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Icon name="admin-panel-settings" size={20} color="#9C27B0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listItemTitle}>{admin.fullName}</Text>
                  <Text style={styles.listItemSub}>{admin.phoneNumber}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8 }}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.listItemSub, { color: COLORS.primary, fontWeight: '700' }]}>
                      {admin.managedGroups?.length || 0} group{(admin.managedGroups?.length || 0) !== 1 ? 's' : ''}
                    </Text>
                    <Text style={[styles.listItemSub, { fontSize: 11 }]}>
                      {admin.lastLogin ? `Last: ${formatDate(admin.lastLogin)}` : 'Never logged in'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteAdmin(admin.id, admin.fullName)}
                    style={{ padding: 6, borderRadius: 6, backgroundColor: '#FFEBEE' }}>
                    <Icon name="delete" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Create Admin Modal */}
        <Modal visible={showCreateAdminModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Icon name="person-add" size={24} color="#9C27B0" />
                <Text style={styles.modalTitle}>Create New Admin</Text>
                <TouchableOpacity onPress={() => { setShowCreateAdminModal(false); setCreatedAdminPin(''); }}>
                  <Icon name="close" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
              {createdAdminPin ? (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Icon name="check-circle" size={64} color={COLORS.success} />
                  <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 }}>Admin Created!</Text>
                  <Text style={{ fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 16 }}>
                    Share this temporary PIN with the new admin.
                  </Text>
                  <View style={{ backgroundColor: '#F3E5F5', borderRadius: 12, padding: 20, alignItems: 'center', width: '100%' }}>
                    <Text style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 4 }}>Temporary PIN</Text>
                    <Text style={{ fontSize: 36, fontWeight: '700', color: '#9C27B0', letterSpacing: 8 }}>{createdAdminPin}</Text>
                  </View>
                  <TouchableOpacity style={[styles.button, { backgroundColor: '#9C27B0', marginTop: 20 }]}
                    onPress={() => { setShowCreateAdminModal(false); setCreatedAdminPin(''); setNewAdminName(''); setNewAdminPhone(''); }}>
                    <Text style={styles.buttonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput style={styles.input} value={newAdminName} onChangeText={setNewAdminName} placeholder="Enter admin's full name" placeholderTextColor={COLORS.textLight} />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput style={styles.input} value={newAdminPhone} onChangeText={setNewAdminPhone} placeholder="e.g. 0831234567"
                      placeholderTextColor={COLORS.textLight} keyboardType="phone-pad" maxLength={10} />
                  </View>
                  <TouchableOpacity style={[styles.button, { backgroundColor: '#9C27B0', opacity: creatingAdmin ? 0.7 : 1, flexDirection: 'row', gap: 8 }]}
                    onPress={handleCreateAdmin} disabled={creatingAdmin}>
                    {creatingAdmin ? <ActivityIndicator color="#fff" /> : <><Icon name="person-add" size={20} color="#fff" /><Text style={styles.buttonText}>Create Admin</Text></>}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║                    ADMIN DASHBOARD                          ║
  // ╚══════════════════════════════════════════════════════════════╝
  if (isAdmin) {
    // ---------- ADMIN SUB-SCREENS ----------
    if (adminView !== 'main' && selectedGroup) {
      return (
        <ScrollView style={styles.screenContainer}>
          {/* Sub-screen Header */}
          <View style={[styles.subScreenHeader, { backgroundColor: COLORS.admin }]}>
            <TouchableOpacity onPress={() => setAdminView('main')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="arrow-back" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{selectedGroup.name}</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Analytics Sub-screen */}
          {adminView === 'analytics' && (
            <View style={{ padding: 16 }}>
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
                    <Text style={styles.financialValue}>{formatCurrency(groupTransactions.filter(t => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0))}</Text>
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
                  const expected = memberCount * selectedGroup.contributionAmount;
                  const collected = groupTransactions.filter(t => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0);
                  const rate = expected > 0 ? (collected / expected) * 100 : 0;
                  return (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, color: COLORS.textLight }}>This Period</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: rate >= 80 ? COLORS.success : COLORS.warning }}>{Math.round(rate)}%</Text>
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
                    <View style={[styles.listItemIcon, { backgroundColor: tx.transactionType === 'CONTRIBUTION' ? '#ECFDF5' : '#FFEBEE' }]}>
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
                {groupTransactions.length === 0 && <Text style={styles.emptyText}>No transactions yet</Text>}
              </View>
            </View>
          )}

          {/* Announcements Sub-screen */}
          {adminView === 'announcements' && (
            <View style={{ padding: 16 }}>
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="announcement" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Announcements</Text>
                  <TouchableOpacity onPress={() => setShowAnnouncementForm(true)} style={styles.addBtnSmall}>
                    <Icon name="add" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>New</Text>
                  </TouchableOpacity>
                </View>
                {announcements.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Icon name="announcement" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>No announcements yet</Text>
                  </View>
                ) : announcements.map(ann => (
                  <View key={ann.id} style={[styles.listItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                      <Text style={[styles.listItemTitle, { flex: 1 }]}>{ann.pinned ? '📌 ' : ''}{ann.title}</Text>
                      <TouchableOpacity onPress={() => handleDeleteAnnouncement(ann.id)}>
                        <Icon name="delete" size={18} color={COLORS.error} />
                      </TouchableOpacity>
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
              <Modal visible={showAnnouncementForm} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Icon name="announcement" size={24} color={COLORS.primary} />
                      <Text style={styles.modalTitle}>New Announcement</Text>
                      <TouchableOpacity onPress={() => setShowAnnouncementForm(false)}>
                        <Icon name="close" size={24} color={COLORS.textLight} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Title *</Text>
                      <TextInput style={styles.input} value={newAnnTitle} onChangeText={setNewAnnTitle} placeholder="Announcement title" />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Content *</Text>
                      <TextInput style={[styles.input, { height: 100 }]} value={newAnnContent} onChangeText={setNewAnnContent}
                        placeholder="Write your announcement..." multiline />
                    </View>
                    <TouchableOpacity style={styles.button} onPress={handleCreateAnnouncement}>
                      <Text style={styles.buttonText}>Post Announcement</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </View>
          )}

          {/* Meetings Sub-screen */}
          {adminView === 'meetings' && (
            <View style={{ padding: 16 }}>
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="event" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Meetings</Text>
                  <TouchableOpacity onPress={() => setShowMeetingForm(true)} style={styles.addBtnSmall}>
                    <Icon name="add" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Schedule</Text>
                  </TouchableOpacity>
                </View>
                {meetings.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <Icon name="event" size={48} color="#ccc" />
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
              <Modal visible={showMeetingForm} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Icon name="event" size={24} color={COLORS.primary} />
                      <Text style={styles.modalTitle}>Schedule Meeting</Text>
                      <TouchableOpacity onPress={() => setShowMeetingForm(false)}>
                        <Icon name="close" size={24} color={COLORS.textLight} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Title *</Text>
                      <TextInput style={styles.input} value={newMeetTitle} onChangeText={setNewMeetTitle} placeholder="Meeting title" />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Description</Text>
                      <TextInput style={[styles.input, { height: 80 }]} value={newMeetDesc} onChangeText={setNewMeetDesc} placeholder="Description..." multiline />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Date & Time * (YYYY-MM-DD HH:MM)</Text>
                      <TextInput style={styles.input} value={newMeetDate} onChangeText={setNewMeetDate} placeholder="e.g. 2025-03-15 18:00" />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Location</Text>
                      <TextInput style={styles.input} value={newMeetLocation} onChangeText={setNewMeetLocation} placeholder="Meeting location" />
                    </View>
                    <TouchableOpacity style={styles.button} onPress={handleCreateMeeting}>
                      <Text style={styles.buttonText}>Schedule Meeting</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </View>
          )}

          {/* Members Sub-screen */}
          {adminView === 'members' && (
            <View style={{ padding: 16 }}>
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Icon name="people" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Members ({groupMembers.length})</Text>
                  <TouchableOpacity onPress={() => { setShowAddMemberModal(true); setAddedMemberPin(''); }} style={styles.addBtnSmall}>
                    <Icon name="person-add" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Add</Text>
                  </TouchableOpacity>
                </View>
                {groupMembers.length === 0 ? (
                  <Text style={styles.emptyText}>No members found</Text>
                ) : groupMembers.map((m: GroupMember) => (
                  <View key={m.id} style={styles.listItem}>
                    <View style={[styles.listItemIcon, {
                      backgroundColor: m.paymentStatus === 'PAID' ? '#ECFDF5' : m.paymentStatus === 'PENDING' ? '#FFF3E0' : '#FFEBEE'
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
            </View>
          )}

          {/* Add Member Modal */}
          <Modal visible={showAddMemberModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Icon name="person-add" size={24} color={COLORS.primary} />
                  <Text style={styles.modalTitle}>Add Member</Text>
                  <TouchableOpacity onPress={() => { setShowAddMemberModal(false); setAddedMemberPin(''); }}>
                    <Icon name="close" size={24} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
                {selectedGroup && (
                  <View style={{ backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>Group: {selectedGroup.name}</Text>
                  </View>
                )}
                {addedMemberPin ? (
                  <View style={{ alignItems: 'center', padding: 20 }}>
                    <Icon name="check-circle" size={48} color={COLORS.success} />
                    <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 12, color: COLORS.text }}>Member Added!</Text>
                    <Text style={{ fontSize: 14, color: COLORS.textLight, marginTop: 4, textAlign: 'center' }}>Share this temporary PIN with the member</Text>
                    <View style={{ backgroundColor: '#FFF3E0', padding: 16, borderRadius: 12, marginTop: 16 }}>
                      <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.warning, letterSpacing: 8, textAlign: 'center' }}>{addedMemberPin}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: COLORS.error, marginTop: 8 }}>Member must change PIN on first login</Text>
                    <TouchableOpacity style={[styles.button, { marginTop: 20, width: '100%' }]} onPress={() => { setShowAddMemberModal(false); setAddedMemberPin(''); }}>
                      <Text style={styles.buttonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Full Name *</Text>
                      <TextInput style={styles.input} value={newMemberName} onChangeText={setNewMemberName} placeholder="Enter full name" />
                    </View>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Phone Number *</Text>
                      <TextInput style={styles.input} value={newMemberPhone} onChangeText={setNewMemberPhone} placeholder="e.g. 0831234567" keyboardType="phone-pad" maxLength={10} />
                    </View>
                    <TouchableOpacity style={[styles.button, addingMember && { opacity: 0.7 }]} onPress={handleAddMember} disabled={addingMember}>
                      <Text style={styles.buttonText}>{addingMember ? 'Adding...' : 'Add Member'}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </Modal>
        </ScrollView>
      );
    }

    // ---------- ADMIN MAIN VIEW ----------
    return (
      <>
        <ScrollView style={styles.screenContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
          {/* Header */}
          <View style={[styles.dashboardHeader, { backgroundColor: COLORS.admin }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Icon name="person" size={28} color="#fff" />
                </View>
                <View>
                  <Text style={styles.greeting}>Welcome back,</Text>
                  <Text style={styles.userName}>{auth.user?.fullName?.split(' ')[0] || 'Admin'}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.roleBadgeText}>ADMIN</Text>
                </View>
              </View>
            </View>
          </View>

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
              <Icon name="groups" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No Groups Yet</Text>
              <Text style={styles.emptyText}>Create a stokvel group to get started</Text>
            </View>
          ) : groups.map(group => {
            const memberCount = group._count?.members || group.memberCount || 0;
            const txCount = group._count?.transactions || 0;
            return (
              <View key={group.id} style={styles.groupCardAdmin}>
                <View style={styles.groupCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={[styles.groupIconBg, { backgroundColor: '#EFF6FF' }]}>
                      <Icon name="account-balance" size={22} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupCardName}>{group.name}</Text>
                      <Text style={styles.groupCardSub}>
                        {formatCurrency(group.contributionAmount)}/{group.contributionFrequency === 'MONTHLY' ? 'month' : 'week'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.frequencyBadge, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600' }}>{group.contributionFrequency}</Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={{ flexDirection: 'row', marginVertical: 12, gap: 16 }}>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.primary }}>{memberCount}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textLight }}>Members</Text>
                  </View>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.success }}>{txCount}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textLight }}>Transactions</Text>
                  </View>
                  <View style={{ alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.secondary }}>
                      {new Date(group.createdAt).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textLight }}>Since</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.groupActionRow}>
                  <TouchableOpacity style={styles.groupActionBtn} onPress={() => openAdminSubScreen('analytics', group)}>
                    <Icon name="bar-chart" size={16} color={COLORS.primary} />
                    <Text style={styles.groupActionText}>Analytics</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.groupActionBtn} onPress={() => openAdminSubScreen('announcements', group)}>
                    <Icon name="announcement" size={16} color={COLORS.primary} />
                    <Text style={styles.groupActionText}>Announce</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.groupActionBtn} onPress={() => openAdminSubScreen('meetings', group)}>
                    <Icon name="event" size={16} color={COLORS.primary} />
                    <Text style={styles.groupActionText}>Meeting</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.groupActionRow}>
                  <TouchableOpacity style={styles.groupActionBtn} onPress={() => openAdminSubScreen('members', group)}>
                    <Icon name="people" size={16} color={COLORS.primary} />
                    <Text style={styles.groupActionText}>Members</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.groupActionBtn} onPress={() => onNavigateTab('ledger')}>
                    <Icon name="menu-book" size={16} color={COLORS.primary} />
                    <Text style={styles.groupActionText}>Ledger</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.groupActionBtn} onPress={() => onNavigateTab('chat', group.id)}>
                    <Icon name="chat-bubble" size={16} color={COLORS.primary} />
                    <Text style={styles.groupActionText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Create Group Modal */}
        <Modal visible={showCreateGroupModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Icon name="group-add" size={24} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Create New Group</Text>
                <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                  <Icon name="close" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Group Name *</Text>
                <TextInput style={styles.input} value={newGroupName} onChangeText={setNewGroupName} placeholder="e.g., Family Stokvel" />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 80 }]} value={newGroupDesc} onChangeText={setNewGroupDesc} placeholder="Brief description..." multiline />
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
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateGroupModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, creatingGroup && styles.buttonDisabled]} onPress={handleCreateGroup} disabled={creatingGroup}>
                  {creatingGroup ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║                   MEMBER DASHBOARD                          ║
  // ╚══════════════════════════════════════════════════════════════╝
  const primaryGroup = memberGroups[selectedMemberGroupIdx] || memberGroups[0] || null;
  const totalSaved = myTransactions.filter(t => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED').reduce((s, t) => s + t.amount, 0);
  const totalToSave = primaryGroup ? Number(primaryGroup.contributionAmount) * (primaryGroup.durationMonths || 12) : 0;
  const savingsProgress = totalToSave > 0 ? (totalSaved / totalToSave) * 100 : 0;

  return (
    <>
      <ScrollView style={styles.screenContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
        {/* Header */}
        <View style={[styles.dashboardHeader, { backgroundColor: COLORS.member }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Icon name="person" size={28} color="#fff" />
              </View>
              <View>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{auth.user?.fullName?.split(' ')[0] || 'Member'}</Text>
              </View>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.roleBadgeText}>MEMBER</Text>
            </View>
          </View>
          {primaryGroup && (
            <View style={styles.groupInfoBar}>
              <Icon name="groups" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>{primaryGroup.name}</Text>
            </View>
          )}
        </View>

        {/* Group Selector for multi-group members */}
        {memberGroups.length > 1 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              {memberGroups.map((g, idx) => (
                <TouchableOpacity key={g.id} onPress={() => setSelectedMemberGroupIdx(idx)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8,
                    backgroundColor: idx === selectedMemberGroupIdx ? COLORS.member : '#F3F4F6',
                    borderWidth: 1, borderColor: idx === selectedMemberGroupIdx ? COLORS.member : '#E5E7EB' }}>
                  <Text style={{ fontSize: 13, fontWeight: idx === selectedMemberGroupIdx ? '700' : '500',
                    color: idx === selectedMemberGroupIdx ? '#fff' : COLORS.text }}>{g.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {!primaryGroup ? (
          <View style={[styles.emptyStateCard, { margin: 16 }]}>
            <Icon name="groups" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>Not in a Group</Text>
            <Text style={styles.emptyText}>Ask your group admin to invite you</Text>
          </View>
        ) : (
          <>
            {/* MY SAVINGS Card */}
            <View style={styles.cardElevated}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="account-balance-wallet" size={20} color={COLORS.member} />
                <Text style={[styles.sectionHeaderTitle, { color: COLORS.member }]}>MY SAVINGS</Text>
              </View>
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: COLORS.textLight }}>Progress</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.member }}>{Math.round(savingsProgress)}%</Text>
                </View>
                <ProgressBar progress={savingsProgress} color={COLORS.member} height={10} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 12, color: COLORS.textLight }}>Total to save</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>{formatCurrency(totalToSave)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: COLORS.textLight }}>Total saved</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.success }}>{formatCurrency(totalSaved)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: COLORS.textLight }}>Remaining</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.warning }}>{formatCurrency(Math.max(0, totalToSave - totalSaved))}</Text>
                </View>
              </View>
            </View>

            {/* NEXT PAYMENT Card */}
            <View style={styles.cardElevated}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="today" size={20} color={COLORS.primary} />
                <Text style={styles.sectionHeaderTitle}>NEXT PAYMENT</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 12, color: COLORS.textLight }}>Amount Due</Text>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.primary }}>{formatCurrency(primaryGroup.contributionAmount)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: COLORS.textLight }}>Frequency</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>{primaryGroup.contributionFrequency}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.payNowBtn} onPress={() => { setPaymentGroup(primaryGroup); setShowPaymentModal(true); }}>
                <Icon name="payments" size={22} color="#fff" />
                <Text style={styles.payNowText}>PAY NOW {formatCurrency(primaryGroup.contributionAmount)}</Text>
              </TouchableOpacity>
              <View style={{ marginTop: 12, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 12, color: COLORS.textLight, textAlign: 'center' }}>
                  Select your payment method in the payment screen above
                </Text>
              </View>
            </View>

            {/* Recent Transactions */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="receipt-long" size={20} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
              </View>
              {myTransactions.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Icon name="receipt-long" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>No transactions yet</Text>
                </View>
              ) : myTransactions.slice(0, 5).map(tx => (
                <View key={tx.id} style={styles.listItem}>
                  <View style={[styles.listItemIcon, { backgroundColor: tx.transactionType === 'CONTRIBUTION' ? '#ECFDF5' : '#FFEBEE' }]}>
                    <Icon name="trending-up" size={18} color={tx.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItemTitle}>{tx.transactionType}</Text>
                    <Text style={styles.listItemSub}>{formatDate(tx.transactionDate)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700', color: tx.transactionType === 'CONTRIBUTION' ? COLORS.success : COLORS.error }}>
                      {tx.transactionType === 'CONTRIBUTION' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: tx.status === 'COMPLETED' ? '#ECFDF5' : '#FFF3E0' }]}>
                      <Text style={[styles.statusText, { color: tx.status === 'COMPLETED' ? COLORS.success : COLORS.warning }]}>{tx.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Announcements */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="announcement" size={20} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Announcements</Text>
              </View>
              {memberAnnouncements.length === 0 ? (
                <Text style={styles.emptyText}>No announcements</Text>
              ) : memberAnnouncements.slice(0, 3).map(ann => (
                <TouchableOpacity key={ann.id} style={[styles.listItem, { flexDirection: 'column', alignItems: 'flex-start' }]}
                  onPress={() => handleMarkAnnouncementRead(ann.id)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {ann.pinned && <Text>📌</Text>}
                    <Text style={[styles.listItemTitle, !ann.isRead && { color: COLORS.primary }]}>{ann.title}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: COLORS.textLight, marginTop: 2 }} numberOfLines={2}>{ann.content}</Text>
                  <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{formatDate(ann.createdAt)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Upcoming Meeting */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="event" size={20} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Upcoming Meetings</Text>
              </View>
              {memberMeetings.filter(mtg => new Date(mtg.date) >= new Date(new Date().toDateString())).length === 0 ? (
                <Text style={styles.emptyText}>No upcoming meetings</Text>
              ) : memberMeetings.filter(mtg => new Date(mtg.date) >= new Date(new Date().toDateString())).map(mtg => (
                <View key={mtg.id} style={[styles.listItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                  <Text style={styles.listItemTitle}>{mtg.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
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
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={[styles.rsvpBtn, mtg.myStatus === 'GOING' && styles.rsvpBtnActive]}
                      onPress={() => handleRSVP(mtg.id, 'GOING')}>
                      <Text style={[styles.rsvpBtnText, mtg.myStatus === 'GOING' && styles.rsvpBtnTextActive]}>
                        ✓ Going {mtg.goingCount ? `(${mtg.goingCount})` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rsvpBtn, mtg.myStatus === 'MAYBE' && { backgroundColor: COLORS.warning, borderColor: COLORS.warning }]}
                      onPress={() => handleRSVP(mtg.id, 'MAYBE')}>
                      <Text style={[styles.rsvpBtnText, mtg.myStatus === 'MAYBE' && styles.rsvpBtnTextActive]}>
                        ? Maybe {mtg.maybeCount ? `(${mtg.maybeCount})` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rsvpBtn, mtg.myStatus === 'NOT_GOING' && { backgroundColor: COLORS.error, borderColor: COLORS.error }]}
                      onPress={() => handleRSVP(mtg.id, 'NOT_GOING')}>
                      <Text style={[styles.rsvpBtnText, mtg.myStatus === 'NOT_GOING' && styles.rsvpBtnTextActive]}>✗ No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="payments" size={24} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            {paymentGroup && (
              <>
                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textLight }}>Payment Amount</Text>
                  <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.primary, marginTop: 4 }}>
                    {formatCurrency(paymentGroup.contributionAmount)}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textLight, marginTop: 4 }}>→ {paymentGroup.name}</Text>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Payment Method</Text>
                  <View style={styles.frequencyRow}>
                    {[{ key: 'CASH', label: 'Cash', icon: 'cash' }, { key: 'BANK_TRANSFER', label: 'Bank', icon: 'bank' }, { key: 'MOBILE_MONEY', label: 'Mobile', icon: 'cellphone' }].map(m => (
                      <TouchableOpacity key={m.key} style={[styles.typeBtn, paymentMethod === m.key && styles.typeBtnActive]}
                        onPress={() => setPaymentMethod(m.key)}>
                        <MaterialCommunityIcons name={m.icon as any} size={18} color={paymentMethod === m.key ? '#fff' : COLORS.textLight} />
                        <Text style={[styles.typeBtnText, paymentMethod === m.key && styles.typeBtnTextActive]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput style={styles.input} value={paymentNotes} onChangeText={setPaymentNotes} placeholder="Add a note..." />
                </View>
                <TouchableOpacity style={[styles.payNowBtn, paying && styles.buttonDisabled]} onPress={handleMemberPayment} disabled={paying}>
                  {paying ? <ActivityIndicator color="#fff" /> : (
                    <><Icon name="payments" size={20} color="#fff" /><Text style={styles.payNowText}>Confirm Payment</Text></>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};
