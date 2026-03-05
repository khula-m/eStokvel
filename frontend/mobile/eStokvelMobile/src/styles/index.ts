import { StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { scaleFontSize } from '../utils/responsive';

// Helper for cross-platform shadows
const shadow = (offsetY: number, blur: number, opacity: number): any =>
  Platform.OS === 'web'
    ? { boxShadow: `0 ${offsetY}px ${blur}px rgba(0,0,0,${opacity})` }
    : { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: blur / 2, elevation: Math.round(blur / 2) };

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  // Auth Screens
  authScrollContent: { flexGrow: 1, padding: 24, backgroundColor: '#F8FAFC' },
  logoContainer: { alignItems: 'center', marginTop: 48, marginBottom: 36 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    ...shadow(6, 20, 0.2),
  },
  logoTitle: { fontSize: scaleFontSize(30), fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  logoTagline: { fontSize: 14, color: '#94A3B8', marginTop: 6, letterSpacing: 0.2 },
  authCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    ...shadow(4, 24, 0.06),
  },
  authCardTitle: { fontSize: scaleFontSize(24), fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  authCardSubtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 28 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  authInput: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, fontSize: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0', color: '#1E293B',
  },
  passwordInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#1E293B' },
  passwordToggle: { padding: 16 },
  primaryButton: {
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 18,
    alignItems: 'center', marginTop: 24, ...shadow(4, 16, 0.2),
  },
  primaryButtonText: { color: '#fff', fontSize: scaleFontSize(16), fontWeight: '700', letterSpacing: 0.3 },
  authFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32, gap: 4 },
  authFooterText: { color: '#94A3B8', fontSize: 14 },
  authFooterLink: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  // Input & Form
  inputContainer: { marginBottom: 18 },
  inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, fontSize: 15,
    borderWidth: 1.5, borderColor: '#E2E8F0', color: '#1E293B',
  },
  inputError: { borderColor: COLORS.error, borderWidth: 2 },
  validationText: { fontSize: 12, marginTop: 6 },
  validationSuccess: { color: COLORS.success },
  validationError: { color: COLORS.error },
  subtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', marginBottom: 32 },

  // Buttons
  button: {
    backgroundColor: COLORS.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 16, minWidth: 100, ...shadow(2, 8, 0.15),
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: scaleFontSize(15), fontWeight: '700' },

  // Screen Container
  screenContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  screenTitle: { fontSize: scaleFontSize(22), fontWeight: '800', color: '#1E293B', padding: 16 },

  // Dashboard Header
  dashboardHeader: {
    backgroundColor: COLORS.primary, paddingTop: 20, paddingBottom: 32,
    paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    ...shadow(8, 24, 0.15),
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIconContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  userName: { fontSize: scaleFontSize(24), fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: 0.3 },
  roleBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  groupInfoBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 16, padding: 12, borderRadius: 14,
  },

  // Cards
  cardElevated: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: -16,
    borderRadius: 20, padding: 20, marginBottom: 14,
    ...shadow(4, 20, 0.06),
  },
  section: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 18,
    ...shadow(2, 8, 0.04),
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionHeaderTitle: { fontSize: 14, fontWeight: '700', color: '#475569', flex: 1, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionTitle: { fontSize: scaleFontSize(17), fontWeight: '700', color: '#1E293B', flex: 1 },

  // Financial Grid
  financialGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  financialItem: { width: '50%', paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' },
  financialLabel: { fontSize: scaleFontSize(12), color: '#94A3B8', marginTop: 6, fontWeight: '500' },
  financialValue: { fontSize: scaleFontSize(18), fontWeight: '700', color: '#1E293B', marginTop: 2 },

  // Quick Actions
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  quickActionBtn: { alignItems: 'center', paddingHorizontal: 8 },
  quickActionIconBg: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 11, color: '#64748B', fontWeight: '600', textAlign: 'center' },

  // List Items
  listItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12,
  },
  listItemIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  listItemTitle: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  listItemSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  // Admin Group Cards
  groupCardAdmin: {
    backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 6,
    borderRadius: 20, padding: 18, ...shadow(2, 12, 0.06),
  },
  groupCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupIconBg: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  groupCardName: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  groupCardSub: { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  frequencyBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  groupActionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  groupActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  groupActionText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },

  // Sub-screen Header
  subScreenHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 20,
  },
  addBtnSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    ...shadow(2, 8, 0.15),
  },

  // Payment Status
  paymentStatusLabel: { fontSize: 12, fontWeight: '700' },

  // Pay Now Button
  payNowBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    ...shadow(6, 20, 0.2),
  },
  payNowText: { color: '#fff', fontSize: scaleFontSize(17), fontWeight: '800', letterSpacing: 0.3 },

  // RSVP Buttons
  rsvpBtn: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  rsvpBtnActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  rsvpBtnText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
  rsvpBtnTextActive: { color: '#fff' },

  // Transaction Row
  transactionType: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  transactionDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  transactionGroup: { fontSize: 11, color: '#64748B', marginTop: 2 },
  transactionCard: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 16,
    marginHorizontal: 16, marginVertical: 4, borderRadius: 16, alignItems: 'center',
    ...shadow(1, 6, 0.04),
  },
  transactionIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  transactionInfo: { flex: 1 },
  transactionAmountContainer: { alignItems: 'flex-end' },
  transactionAmountLarge: { fontSize: 16, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Stats Card
  statsCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, margin: 8,
    borderLeftWidth: 4, ...shadow(2, 10, 0.06),
  },
  statsTitle: { fontSize: 12, color: '#94A3B8', marginBottom: 6, fontWeight: '500' },
  statsValue: { fontSize: scaleFontSize(20), fontWeight: '800', letterSpacing: 0.2 },
  statsSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  // Filter
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10 },
  filterBtn: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBtnText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  filterBtnTextActive: { color: '#fff' },

  // Ledger Header
  ledgerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff',
  },

  // Chat Styles
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#fff',
  },
  chatGroupChip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  chatGroupChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chatGroupChipText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  chatGroupChipTextActive: { color: '#fff' },
  chatDateSeparator: { alignItems: 'center', marginVertical: 14 },
  chatDateText: {
    fontSize: 12, color: '#94A3B8', backgroundColor: '#F1F5F9',
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, fontWeight: '500',
  },
  chatBubble: { maxWidth: '80%', borderRadius: 20, padding: 14, marginVertical: 3 },
  chatBubbleMe: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  chatBubbleOther: {
    backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 6,
    ...shadow(1, 4, 0.06),
  },
  chatSenderName: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  chatMessageText: { fontSize: scaleFontSize(15), color: '#1E293B', lineHeight: 21 },
  chatTime: { fontSize: 10, color: '#94A3B8', marginTop: 4, alignSelf: 'flex-end' },
  chatInputBar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  chatInput: {
    flex: 1, backgroundColor: '#F1F5F9', borderRadius: 22, paddingHorizontal: 18,
    paddingVertical: 12, fontSize: 15, maxHeight: 100, marginRight: 10,
  },
  chatSendBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', ...shadow(2, 8, 0.15),
  },

  // Empty States
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { width: 88, height: 88, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: scaleFontSize(18), fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptyText: { fontSize: scaleFontSize(14), color: '#94A3B8', textAlign: 'center' },
  emptyStateCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 28, alignItems: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '85%',
  },
  modalTitle: { fontSize: scaleFontSize(19), fontWeight: '700', color: '#1E293B', flex: 1, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
  modalCancelBtn: {
    flex: 1, padding: 16, alignItems: 'center', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  modalCancelText: { color: '#64748B', fontWeight: '600' },

  // Frequency
  frequencyRow: { flexDirection: 'row', gap: 8 },
  frequencyBtn: {
    flex: 1, padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
  },
  frequencyBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  frequencyBtnText: { color: '#64748B', fontWeight: '600' },
  frequencyBtnTextActive: { color: '#fff' },

  // Type Buttons (payment method etc)
  typeBtn: {
    flex: 1, padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, gap: 4,
  },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },

  // Profile
  profileHeaderCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 24, padding: 28,
    alignItems: 'center', ...shadow(4, 20, 0.06),
  },
  profileAvatar: {
    width: 92, height: 92, borderRadius: 24, justifyContent: 'center',
    alignItems: 'center', marginBottom: 18, ...shadow(4, 16, 0.15),
  },
  profileAvatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  profileFullName: { fontSize: scaleFontSize(22), fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  profileRoleBadge: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, marginBottom: 22 },
  profileRoleBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  profileStatsRow: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 18,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', width: '100%',
  },
  profileStatItem: { flex: 1, alignItems: 'center' },
  profileStatValue: { fontSize: scaleFontSize(20), fontWeight: '800', color: COLORS.primary },
  profileStatLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: '500' },
  profileStatDivider: { width: 1, height: 32, backgroundColor: '#F1F5F9' },
  profileSection: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, padding: 18, ...shadow(1, 6, 0.04),
  },
  profileSectionHeader: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  profileSectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  profileInfoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  profileInfoIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  profileInfoContent: { flex: 1 },
  profileInfoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  profileInfoValue: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginTop: 2 },
  profileActionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  profileActionLeft: { flexDirection: 'row', alignItems: 'center' },
  profileActionText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  profileActionIconBg: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  logoutButtonLarge: {
    flexDirection: 'row', backgroundColor: '#FEF2F2', marginHorizontal: 16,
    marginTop: 8, marginBottom: 16, padding: 18, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutButtonLargeText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
  versionText: { textAlign: 'center', color: '#CBD5E1', marginVertical: 24, fontSize: 12 },

  // Tab Bar (fallback; actual styles in BottomTabBar.tsx)
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 0,
    paddingVertical: 8, paddingBottom: 20, ...shadow(-2, 12, 0.06),
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  tabLabelActive: { color: COLORS.primary, fontWeight: '700' },
  tabContent: { flex: 1 },
});
