import { StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },

  // Auth Screens
  authScrollContent: { flexGrow: 1, padding: 24, backgroundColor: '#f5f7fa' },
  logoContainer: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    boxShadow: '0px 4px 8px rgba(10, 36, 99, 0.3)',
  },
  logoTitle: { fontSize: 32, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  logoTagline: { fontSize: 14, color: '#666', marginTop: 4 },
  authCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.08)' },
  authCardTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  authCardSubtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  authInput: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1.5, borderColor: '#e8e8e8', color: '#333' },
  passwordInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 1.5, borderColor: '#e8e8e8' },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#333' },
  passwordToggle: { padding: 16 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 24, boxShadow: '0px 4px 8px rgba(10, 36, 99, 0.3)' },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  authFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32, gap: 4 },
  authFooterText: { color: '#666', fontSize: 14 },
  authFooterLink: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  // Input & Form
  inputContainer: { marginBottom: 16 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: 'bold' },
  input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  inputError: { borderColor: '#f44336', borderWidth: 2 },
  validationText: { fontSize: 12, marginTop: 4 },
  validationSuccess: { color: '#4caf50' },
  validationError: { color: '#f44336' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },

  // Buttons
  button: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16, minWidth: 100 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Screen Container
  screenContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', padding: 16 },

  // Dashboard Header
  dashboardHeader: { backgroundColor: COLORS.primary, paddingTop: 20, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 2 },
  roleBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  roleBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  groupInfoBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 16, padding: 12, borderRadius: 12 },

  // Cards
  cardElevated: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: -16, borderRadius: 16, padding: 16, boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)', marginBottom: 12 },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },

  // Financial Grid
  financialGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  financialItem: { width: '50%', paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  financialLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  financialValue: { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 2 },

  // Quick Actions
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  quickActionBtn: { alignItems: 'center', paddingHorizontal: 8 },
  quickActionIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center' },

  // List Items
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  listItemIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  listItemSub: { fontSize: 12, color: '#888', marginTop: 2 },

  // Admin Group Cards
  groupCardAdmin: { backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 6, borderRadius: 16, padding: 16, boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)' },
  groupCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  groupCardName: { fontSize: 16, fontWeight: '700', color: '#333' },
  groupCardSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  frequencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  groupActionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  groupActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#F5F7FA', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 4 },
  groupActionText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

  // Sub-screen Header
  subScreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20 },
  addBtnSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },

  // Payment Status
  paymentStatusLabel: { fontSize: 12, fontWeight: '700' },

  // Pay Now Button
  payNowBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0px 4px 12px rgba(10, 36, 99, 0.3)' },
  payNowText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // RSVP Buttons
  rsvpBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  rsvpBtnActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  rsvpBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  rsvpBtnTextActive: { color: '#fff' },

  // Transaction Row
  transactionType: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  transactionDate: { fontSize: 12, color: '#999', marginTop: 2 },
  transactionGroup: { fontSize: 11, color: '#666', marginTop: 2 },
  transactionCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginVertical: 4, borderRadius: 12, alignItems: 'center' },
  transactionIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionAmountContainer: { alignItems: 'flex-end' },
  transactionAmountLarge: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },

  // Stats Card
  statsCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, margin: 8, borderLeftWidth: 4, boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' },
  statsTitle: { fontSize: 12, color: '#666', marginBottom: 4 },
  statsValue: { fontSize: 20, fontWeight: 'bold' },
  statsSubtitle: { fontSize: 11, color: '#999', marginTop: 4 },

  // Filter
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8 },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterBtnText: { color: '#666', fontWeight: 'bold' },
  filterBtnTextActive: { color: '#fff' },

  // Ledger Header
  ledgerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff' },

  // Chat Styles
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff' },
  chatGroupChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8, borderWidth: 1, borderColor: '#ddd' },
  chatGroupChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chatGroupChipText: { color: '#666', fontWeight: '600', fontSize: 13 },
  chatGroupChipTextActive: { color: '#fff' },
  chatDateSeparator: { alignItems: 'center', marginVertical: 12 },
  chatDateText: { fontSize: 12, color: '#aaa', backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  chatBubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginVertical: 4 },
  chatBubbleMe: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  chatBubbleOther: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, boxShadow: '0px 1px 3px rgba(0,0,0,0.08)' },
  chatSenderName: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  chatMessageText: { fontSize: 15, color: '#333', lineHeight: 20 },
  chatTime: { fontSize: 10, color: '#aaa', marginTop: 4, alignSelf: 'flex-end' },
  chatInputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  chatInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, marginRight: 8 },
  chatSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // Empty States
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center' },
  emptyStateCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 24, alignItems: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalCancelBtn: { flex: 1, padding: 16, alignItems: 'center', marginRight: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  modalCancelText: { color: '#666', fontWeight: 'bold' },

  // Frequency
  frequencyRow: { flexDirection: 'row' },
  frequencyBtn: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8 },
  frequencyBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  frequencyBtnText: { color: '#666', fontWeight: 'bold' },
  frequencyBtnTextActive: { color: '#fff' },

  // Type Buttons (payment method etc)
  typeBtn: { flex: 1, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8, gap: 4 },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
  typeBtnTextActive: { color: '#fff' },

  // Profile
  profileHeaderCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 24, alignItems: 'center', boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.08)' },
  profileAvatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 16, boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)' },
  profileAvatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  profileFullName: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  profileRoleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginBottom: 20 },
  profileRoleBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  profileStatsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee', width: '100%' },
  profileStatItem: { flex: 1, alignItems: 'center' },
  profileStatValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  profileStatLabel: { fontSize: 11, color: '#888', marginTop: 4 },
  profileStatDivider: { width: 1, height: 30, backgroundColor: '#eee' },
  profileSection: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)' },
  profileSectionHeader: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  profileSectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  profileInfoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileInfoContent: { flex: 1 },
  profileInfoLabel: { fontSize: 12, color: '#888' },
  profileInfoValue: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 2 },
  profileActionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  profileActionLeft: { flexDirection: 'row', alignItems: 'center' },
  profileActionText: { fontSize: 15, color: '#333', fontWeight: '500' },
  profileActionIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoutButtonLarge: { flexDirection: 'row', backgroundColor: '#FEE2E2', marginHorizontal: 16, marginTop: 8, marginBottom: 16, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  logoutButtonLargeText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
  versionText: { textAlign: 'center', color: '#aaa', marginVertical: 24, fontSize: 12 },

  // Tab Bar
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 8, paddingBottom: 20 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  tabLabelActive: { color: COLORS.primary, fontWeight: 'bold' },
  tabContent: { flex: 1 },
});
