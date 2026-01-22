import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  RefreshControl,
  FlatList,
  Modal,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

// Backend API URL - change this to your computer's IP address
const API_URL = 'http://192.168.8.150:5000/api';

// Types
interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  role: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  contributionAmount: number;
  contributionFrequency: string;
  memberCount?: number;
  totalBalance?: number;
  createdAt: string;
}

interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  status: string;
  description?: string;
  transactionDate: string;
  member?: { user: { fullName: string } };
  group?: { name: string };
}

interface Member {
  id: string;
  userId: string;
  groupId: string;
  role: string;
  joinedAt: string;
  user: { fullName: string; phoneNumber: string };
  group?: { name: string };
}

// Auth Context
interface AuthState {
  user: User | null;
  token: string | null;
}

// ============ TAB ICONS (Text-based) ============
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons: Record<string, string> = {
    dashboard: '📊',
    groups: '👥',
    transactions: '💰',
    profile: '👤',
  };
  return <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>{icons[name] || '•'}</Text>;
};

// ============ STATS CARD COMPONENT ============
const StatsCard = ({ title, value, subtitle, color = '#2E7D32' }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  color?: string;
}) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]}>
    <Text style={styles.statsTitle}>{title}</Text>
    <Text style={[styles.statsValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
  </View>
);

// ============ LOGIN SCREEN ============
const LoginScreen = ({ onNavigate, onLogin }: { onNavigate: (screen: string) => void; onLogin: (data: any) => void }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter phone and password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        phoneNumber: phone,
        password: password,
      });

      if (response.data.success) {
        onLogin(response.data.data);
        onNavigate('main');
      } else {
        Alert.alert('Error', response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>eStokvel</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="0831234567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate('register')}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============ REGISTER SCREEN ============
const RegisterScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !phone || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        fullName,
        phoneNumber: phone,
        email: email || undefined,
        password,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Registration successful! Please login.', [
          { text: 'OK', onPress: () => onNavigate('login') }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Register</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="0831234567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Min 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate('login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============ DASHBOARD SCREEN ============
const DashboardScreen = ({ auth, onLogout }: { auth: AuthState; onLogout: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalContributions: 0,
    pendingPayouts: 0,
    recentTransactions: [] as Transaction[],
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      
      // Fetch groups count
      const groupsRes = await axios.get(`${API_URL}/groups`, { headers }).catch(() => ({ data: { data: [] } }));
      const groups = groupsRes.data.data || [];
      
      // Fetch transactions - API returns { data: { transactions: [...], pagination: {...} } }
      const transRes = await axios.get(`${API_URL}/transactions`, { headers }).catch(() => ({ data: { data: { transactions: [] } } }));
      const transData = transRes.data.data;
      const transactions = Array.isArray(transData) ? transData : (transData?.transactions || []);
      
      // Calculate stats
      const contributions = transactions
        .filter((t: Transaction) => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED')
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      
      const pendingPayouts = transactions
        .filter((t: Transaction) => t.transactionType === 'PAYOUT' && t.status === 'PENDING')
        .length;

      setStats({
        totalGroups: groups.length,
        totalContributions: contributions,
        pendingPayouts,
        recentTransactions: transactions.slice(0, 5),
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount: number) => `R ${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.screenContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{auth.user?.fullName || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatsCard 
          title="My Groups" 
          value={stats.totalGroups} 
          subtitle="Active stokvels"
        />
        <StatsCard 
          title="Total Contributed" 
          value={formatCurrency(stats.totalContributions)} 
          subtitle="All time"
          color="#1976D2"
        />
      </View>
      
      <View style={styles.statsRow}>
        <StatsCard 
          title="Pending Payouts" 
          value={stats.pendingPayouts} 
          subtitle="Awaiting"
          color="#F57C00"
        />
        <StatsCard 
          title="Role" 
          value={auth.user?.role || 'Member'} 
          subtitle="Account type"
          color="#7B1FA2"
        />
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {stats.recentTransactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet</Text>
        ) : (
          stats.recentTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionType}>
                  {transaction.transactionType === 'CONTRIBUTION' ? '⬆️' : '⬇️'} {transaction.transactionType}
                </Text>
                <Text style={styles.transactionDate}>{formatDate(transaction.transactionDate)}</Text>
              </View>
              <View style={styles.transactionRight}>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.transactionType === 'CONTRIBUTION' ? '#2E7D32' : '#D32F2F' }
                ]}>
                  {transaction.transactionType === 'CONTRIBUTION' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
                <Text style={[
                  styles.transactionStatus,
                  { color: transaction.status === 'COMPLETED' ? '#2E7D32' : '#F57C00' }
                ]}>
                  {transaction.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

// ============ GROUPS SCREEN ============
const GroupsScreen = ({ auth }: { auth: AuthState }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    contributionAmount: '',
    contributionFrequency: 'MONTHLY',
  });
  const [creating, setCreating] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      const response = await axios.get(`${API_URL}/groups`, { headers });
      setGroups(response.data.data || []);
    } catch (error) {
      console.error('Groups fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.contributionAmount) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setCreating(true);
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      await axios.post(`${API_URL}/groups`, {
        name: newGroup.name,
        description: newGroup.description || undefined,
        contributionAmount: parseFloat(newGroup.contributionAmount),
        contributionFrequency: newGroup.contributionFrequency,
      }, { headers });

      Alert.alert('Success', 'Group created successfully!');
      setShowCreateModal(false);
      setNewGroup({ name: '', description: '', contributionAmount: '', contributionFrequency: 'MONTHLY' });
      fetchGroups();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create group';
      Alert.alert('Error', message);
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (amount: number) => `R ${amount.toFixed(2)}`;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>My Groups</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
        contentContainerStyle={groups.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptyText}>Create or join a stokvel group to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupFrequency}>{item.contributionFrequency}</Text>
            </View>
            {item.description && (
              <Text style={styles.groupDescription} numberOfLines={2}>{item.description}</Text>
            )}
            <View style={styles.groupFooter}>
              <Text style={styles.groupAmount}>
                Contribution: {formatCurrency(item.contributionAmount)}
              </Text>
              <Text style={styles.groupMembers}>
                {item.memberCount || 1} member(s)
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Group</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Group Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Family Stokvel"
                value={newGroup.name}
                onChangeText={(text) => setNewGroup({ ...newGroup, name: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                placeholder="Brief description..."
                value={newGroup.description}
                onChangeText={(text) => setNewGroup({ ...newGroup, description: text })}
                multiline
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contribution Amount (R) *</Text>
              <TextInput
                style={styles.input}
                placeholder="500"
                value={newGroup.contributionAmount}
                onChangeText={(text) => setNewGroup({ ...newGroup, contributionAmount: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.frequencyRow}>
                {['WEEKLY', 'MONTHLY'].map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyBtn,
                      newGroup.contributionFrequency === freq && styles.frequencyBtnActive
                    ]}
                    onPress={() => setNewGroup({ ...newGroup, contributionFrequency: freq })}
                  >
                    <Text style={[
                      styles.frequencyBtnText,
                      newGroup.contributionFrequency === freq && styles.frequencyBtnTextActive
                    ]}>
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, creating && styles.buttonDisabled]} 
                onPress={handleCreateGroup}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============ TRANSACTIONS SCREEN ============
const TransactionsScreen = ({ auth }: { auth: AuthState }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CONTRIBUTION' | 'PAYOUT'>('ALL');

  const fetchTransactions = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      const response = await axios.get(`${API_URL}/transactions`, { headers });
      // API returns { data: { transactions: [...], pagination: {...} } }
      const transData = response.data.data;
      const txList = Array.isArray(transData) ? transData : (transData?.transactions || []);
      setTransactions(txList);
    } catch (error) {
      console.error('Transactions fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth.token]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const filteredTransactions = filter === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.transactionType === filter);

  const formatCurrency = (amount: number) => `R ${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Transactions</Text>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'CONTRIBUTION', 'PAYOUT'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'ALL' ? 'All' : f === 'CONTRIBUTION' ? 'In' : 'Out'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
        contentContainerStyle={filteredTransactions.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptyText}>Your transactions will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.transactionCard}>
            <View style={[
              styles.transactionIcon,
              { backgroundColor: item.transactionType === 'CONTRIBUTION' ? '#E8F5E9' : '#FFEBEE' }
            ]}>
              <Text style={{ fontSize: 20 }}>
                {item.transactionType === 'CONTRIBUTION' ? '⬆️' : '⬇️'}
              </Text>
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionType}>{item.transactionType}</Text>
              <Text style={styles.transactionDate}>{formatDate(item.transactionDate)}</Text>
              {item.group && <Text style={styles.transactionGroup}>{item.group.name}</Text>}
            </View>
            <View style={styles.transactionAmountContainer}>
              <Text style={[
                styles.transactionAmountLarge,
                { color: item.transactionType === 'CONTRIBUTION' ? '#2E7D32' : '#D32F2F' }
              ]}>
                {item.transactionType === 'CONTRIBUTION' ? '+' : '-'}{formatCurrency(item.amount)}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.status === 'COMPLETED' ? '#E8F5E9' : '#FFF3E0' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: item.status === 'COMPLETED' ? '#2E7D32' : '#F57C00' }
                ]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};

// ============ PROFILE SCREEN ============
const ProfileScreen = ({ auth, onLogout }: { auth: AuthState; onLogout: () => void }) => {
  const [membershipCount, setMembershipCount] = useState(0);

  useEffect(() => {
    const fetchMemberships = async () => {
      try {
        const headers = { Authorization: `Bearer ${auth.token}` };
        const response = await axios.get(`${API_URL}/groups`, { headers });
        setMembershipCount((response.data.data || []).length);
      } catch (error) {
        console.error('Membership fetch error:', error);
      }
    };
    fetchMemberships();
  }, [auth.token]);

  return (
    <ScrollView style={styles.screenContainer}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {auth.user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.profileName}>{auth.user?.fullName}</Text>
        <Text style={styles.profileRole}>{auth.user?.role}</Text>
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.profileSectionTitle}>Account Information</Text>
        
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Phone Number</Text>
          <Text style={styles.profileValue}>{auth.user?.phoneNumber}</Text>
        </View>
        
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Email</Text>
          <Text style={styles.profileValue}>{auth.user?.email || 'Not set'}</Text>
        </View>
        
        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>User ID</Text>
          <Text style={styles.profileValue}>{auth.user?.id?.slice(0, 8)}...</Text>
        </View>

        <View style={styles.profileItem}>
          <Text style={styles.profileLabel}>Group Memberships</Text>
          <Text style={styles.profileValue}>{membershipCount}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>eStokvel v1.0.0</Text>
    </ScrollView>
  );
};

// ============ BOTTOM TAB BAR ============
const BottomTabBar = ({ 
  currentTab, 
  onTabChange 
}: { 
  currentTab: string; 
  onTabChange: (tab: string) => void 
}) => {
  const tabs = [
    { key: 'dashboard', label: 'Home' },
    { key: 'groups', label: 'Groups' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'profile', label: 'Profile' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tabItem}
          onPress={() => onTabChange(tab.key)}
        >
          <TabIcon name={tab.key} focused={currentTab === tab.key} />
          <Text style={[
            styles.tabLabel,
            currentTab === tab.key && styles.tabLabelActive
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============ MAIN TAB NAVIGATOR ============
const MainTabNavigator = ({ auth, onLogout }: { auth: AuthState; onLogout: () => void }) => {
  const [currentTab, setCurrentTab] = useState('dashboard');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContent}>
        {currentTab === 'dashboard' && <DashboardScreen auth={auth} onLogout={onLogout} />}
        {currentTab === 'groups' && <GroupsScreen auth={auth} />}
        {currentTab === 'transactions' && <TransactionsScreen auth={auth} />}
        {currentTab === 'profile' && <ProfileScreen auth={auth} onLogout={onLogout} />}
      </View>
      <BottomTabBar currentTab={currentTab} onTabChange={setCurrentTab} />
    </SafeAreaView>
  );
};

// ============ MAIN APP ============
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null });

  const navigate = (screen: string) => {
    if (screen === 'login') {
      setAuth({ user: null, token: null }); // Clear auth on logout
    }
    setCurrentScreen(screen);
  };

  const handleLogin = (data: any) => {
    setAuth({
      user: data.user,
      token: data.token,
    });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => navigate('login') },
    ]);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {currentScreen === 'login' && <LoginScreen onNavigate={navigate} onLogin={handleLogin} />}
      {currentScreen === 'register' && <RegisterScreen onNavigate={navigate} />}
      {currentScreen === 'main' && <MainTabNavigator auth={auth} onLogout={handleLogout} />}
    </SafeAreaProvider>
  );
}

// ============ STYLES ============
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    minWidth: 100,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },

  // Screen Container
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    padding: 8,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsSubtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },

  // Section
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  // Transaction Item
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionStatus: {
    fontSize: 11,
    marginTop: 2,
  },

  // Transaction Card (for list)
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionGroup: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmountLarge: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#2E7D32',
  },
  filterBtnText: {
    color: '#666',
    fontWeight: 'bold',
  },
  filterBtnTextActive: {
    color: '#fff',
  },

  // Groups
  addButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  groupCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  groupFrequency: {
    fontSize: 12,
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  groupAmount: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  groupMembers: {
    fontSize: 14,
    color: '#666',
  },

  // Empty States
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalCancelText: {
    color: '#666',
    fontWeight: 'bold',
  },
  frequencyRow: {
    flexDirection: 'row',
  },
  frequencyBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginRight: 8,
  },
  frequencyBtnActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  frequencyBtnText: {
    color: '#666',
    fontWeight: 'bold',
  },
  frequencyBtnTextActive: {
    color: '#fff',
  },

  // Profile
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
  },
  profileValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
    fontSize: 12,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
    paddingBottom: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
});
