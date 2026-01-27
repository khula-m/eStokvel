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

// Backend API URL - Uses environment variable or falls back to localhost
// To use ngrok: Update .env file with your ngrok URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

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
  _count?: { members: number; transactions: number };
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
  const [showPassword, setShowPassword] = useState(false);

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
      <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>💰</Text>
          </View>
          <Text style={styles.logoTitle}>eStokvel</Text>
          <Text style={styles.logoTagline}>Your Trusted Stokvel Management Platform</Text>
        </View>
        
        {/* Login Card */}
        <View style={styles.authCard}>
          <Text style={styles.authCardTitle}>Welcome Back!</Text>
          <Text style={styles.authCardSubtitle}>Sign in to access your stokvel groups and manage your savings</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>📱 South African Phone Number</Text>
            <TextInput
              style={styles.authInput}
              placeholder="Enter your 10-digit phone number"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>🔒 Your Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your secure password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.passwordToggleText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.authFooter}>
          <Text style={styles.authFooterText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => onNavigate('register')}>
            <Text style={styles.authFooterLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ============ REGISTER SCREEN ============
// Password strength helper
const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  if (score <= 2) return { level: 1, label: 'Weak', color: '#f44336' };
  if (score <= 4) return { level: 2, label: 'Medium', color: '#ff9800' };
  return { level: 3, label: 'Strong', color: '#4caf50' };
};

// SA Phone validation
const isValidSAPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\s|-/g, '');
  return /^0\d{9}$/.test(cleaned);
};

// SA ID validation - simplified check for South African ID numbers
const isValidSAId = (id: string): boolean => {
  // SA ID: 13 digits only
  if (!/^\d{13}$/.test(id)) return false;
  
  // Validate birth date (first 6 digits: YYMMDD)
  const month = parseInt(id.substring(2, 4), 10);
  const day = parseInt(id.substring(4, 6), 10);
  
  // Month must be 01-12
  if (month < 1 || month > 12) return false;
  // Day must be 01-31
  if (day < 1 || day > 31) return false;
  
  // Valid 13-digit ID with valid date format
  return true;
};

const RegisterScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const [step, setStep] = useState(1); // Multi-step form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'TREASURER' | 'MEMBER'>('MEMBER');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const validateStep1 = (): boolean => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    if (!isValidSAPhone(phone)) {
      Alert.alert('Error', 'Please enter a valid South African phone number (10 digits starting with 0)');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!idNumber || idNumber.length !== 13) {
      Alert.alert('ID Number Required', `Please enter your 13-digit South African ID number. Currently entered: ${idNumber.length} digits.`);
      return false;
    }
    if (!isValidSAId(idNumber)) {
      Alert.alert('Error', 'Invalid SA ID number. Please check and try again');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    // Validate ID number (required) - check length first
    if (!idNumber || idNumber.length !== 13) {
      Alert.alert('ID Number Required', `Please enter your 13-digit South African ID number. Currently entered: ${idNumber.length} digits.`);
      return;
    }
    if (!isValidSAId(idNumber)) {
      Alert.alert('Error', 'Invalid South African ID number. Please check and try again');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        fullName,
        phoneNumber: phone,
        email: email || undefined,
        password,
        role: selectedRole,
        idNumber: idNumber,
        address: address || undefined,
        occupation: occupation || undefined,
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

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.registerHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => step > 1 ? setStep(step - 1) : onNavigate('login')}>
            <Text style={styles.backButtonText}>← {step > 1 ? 'Back' : 'Login'}</Text>
          </TouchableOpacity>
          <Text style={styles.registerTitle}>Create Account</Text>
          <Text style={styles.stepIndicator}>Step {step} of 3</Text>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
        </View>
        
        {/* Step Titles */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>
            {step === 1 ? '👤 Personal Information' : step === 2 ? '🔐 Security & Identity Verification' : '📋 Additional Information'}
          </Text>
          <Text style={styles.stepSubtitle}>
            {step === 1 ? 'Tell us about yourself to get started' : step === 2 ? 'Create a secure password and verify your identity' : 'Help us serve you better with optional details'}
          </Text>
        </View>

        <View style={styles.authCard}>

        {step === 1 && (
          <>
            {/* Role Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>👥 I want to register as a...</Text>
              <View style={styles.roleSelectionContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === 'TREASURER' && styles.roleCardSelected,
                  ]}
                  onPress={() => setSelectedRole('TREASURER')}
                >
                  <Text style={styles.roleIcon}>💼</Text>
                  <Text style={[
                    styles.roleTitle,
                    selectedRole === 'TREASURER' && styles.roleTitleSelected,
                  ]}>Treasurer</Text>
                  <Text style={styles.roleDescription}>
                    Create and manage stokvel groups, record contributions
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === 'MEMBER' && styles.roleCardSelected,
                  ]}
                  onPress={() => setSelectedRole('MEMBER')}
                >
                  <Text style={styles.roleIcon}>👤</Text>
                  <Text style={[
                    styles.roleTitle,
                    selectedRole === 'MEMBER' && styles.roleTitleSelected,
                  ]}>Member</Text>
                  <Text style={styles.roleDescription}>
                    Join stokvel groups and track your contributions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>📝 Your Full Name</Text>
              <TextInput
                style={styles.authInput}
                placeholder="Enter your full name as per ID"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>📱 South African Phone Number</Text>
              <TextInput
                style={[styles.authInput, phone && !isValidSAPhone(phone) && styles.inputError]}
                placeholder="0831234567 (10 digits)"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phone.length > 0 && (
                <Text style={[styles.validationText, isValidSAPhone(phone) ? styles.validationSuccess : styles.validationError]}>
                  {isValidSAPhone(phone) ? '✓ Valid South African phone number' : `${10 - phone.length} more digits needed`}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>✉️ Email Address (Optional)</Text>
              <TextInput
                style={styles.authInput}
                placeholder="yourname@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>🔒 Create Your Password (minimum 6 characters)</Text>
              <TextInput
                style={styles.authInput}
                placeholder="Create a strong, secure password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              {password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBars}>
                    <View style={[styles.strengthBar, { backgroundColor: password.length >= 1 ? passwordStrength.color : '#ddd' }]} />
                    <View style={[styles.strengthBar, { backgroundColor: passwordStrength.level >= 2 ? passwordStrength.color : '#ddd' }]} />
                    <View style={[styles.strengthBar, { backgroundColor: passwordStrength.level >= 3 ? passwordStrength.color : '#ddd' }]} />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.label === 'Weak' ? 'Weak Password' : passwordStrength.label === 'Medium' ? 'Medium Strength' : 'Strong Password'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>🔒 Confirm Your Password</Text>
              <TextInput
                style={[styles.authInput, confirmPassword && password !== confirmPassword && styles.inputError]}
                placeholder="Re-enter your password to confirm"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              {confirmPassword.length > 0 && (
                <Text style={[styles.validationText, password === confirmPassword ? styles.validationSuccess : styles.validationError]}>
                  {password === confirmPassword ? '✓ Your passwords match' : '✗ Your passwords do not match'}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>🪪 South African ID Number (13 digits)</Text>
              <TextInput
                style={[styles.authInput, idNumber && !isValidSAId(idNumber) && idNumber.length === 13 && styles.inputError]}
                placeholder="Enter your 13-digit SA ID number"
                placeholderTextColor="#999"
                value={idNumber}
                onChangeText={(text) => setIdNumber(text.replace(/[^0-9]/g, '').slice(0, 13))}
                keyboardType="numeric"
                maxLength={13}
              />
              {idNumber.length > 0 && idNumber.length === 13 && (
                <Text style={[styles.validationText, isValidSAId(idNumber) ? styles.validationSuccess : styles.validationError]}>
                  {isValidSAId(idNumber) ? '✓ Valid South African ID number' : '✗ Invalid South African ID number'}
                </Text>
              )}
              {idNumber.length > 0 && idNumber.length < 13 && (
                <Text style={styles.hintText}>{13 - idNumber.length} more digits needed</Text>
              )}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>🏠 Your Residential Address</Text>
              <TextInput
                style={[styles.authInput, styles.inputMultiline]}
                placeholder="Enter your full address (e.g., 123 Main Street, Soweto, Gauteng)"
                placeholderTextColor="#999"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>💼 Your Occupation or Profession</Text>
              <TextInput
                style={styles.authInput}
                placeholder="Enter your occupation (e.g., Teacher, Nurse, Self-employed)"
                placeholderTextColor="#999"
                value={occupation}
                onChangeText={setOccupation}
              />
            </View>
          </>
        )}
        </View>

        <View style={styles.buttonRow}>
          {step < 3 ? (
            <TouchableOpacity 
              style={[styles.primaryButton, { flex: 1 }]} 
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Continue →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled, { flex: 1 }]} 
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Create {selectedRole === 'TREASURER' ? 'Treasurer' : 'Member'} Account ✓
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.authFooter}>
          <Text style={styles.authFooterText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => onNavigate('login')}>
            <Text style={styles.authFooterLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  
  // Record Transaction State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [recording, setRecording] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    stokvelGroupId: '',
    memberId: '',
    transactionType: 'CONTRIBUTION',
    amount: '',
    paymentMethod: 'CASH',
    notes: '',
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      
      // Fetch groups count
      const groupsRes = await axios.get(`${API_URL}/groups`, { headers }).catch(() => ({ data: { data: [] } }));
      const groupsList = groupsRes.data.data || [];
      setGroups(groupsList);
      
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
        totalGroups: groupsList.length,
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

  // Fetch members when a group is selected
  const fetchGroupMembers = async (groupId: string) => {
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      const response = await axios.get(`${API_URL}/groups/${groupId}/members`, { headers });
      setMembers(response.data.data || []);
    } catch (error) {
      console.error('Members fetch error:', error);
      setMembers([]);
    }
  };

  // Handle recording a transaction
  const handleRecordTransaction = async () => {
    if (!newTransaction.stokvelGroupId || !newTransaction.memberId || !newTransaction.amount) {
      Alert.alert('Error', 'Please select a group, member, and enter an amount');
      return;
    }

    const amount = parseFloat(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setRecording(true);
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      await axios.post(`${API_URL}/transactions`, {
        stokvelGroupId: newTransaction.stokvelGroupId,
        memberId: newTransaction.memberId,
        transactionType: newTransaction.transactionType,
        amount: amount,
        paymentMethod: newTransaction.paymentMethod,
        notes: newTransaction.notes || undefined,
      }, { headers });

      Alert.alert('Success', 'Transaction recorded successfully!');
      setShowRecordModal(false);
      setNewTransaction({
        stokvelGroupId: '',
        memberId: '',
        transactionType: 'CONTRIBUTION',
        amount: '',
        paymentMethod: 'CASH',
        notes: '',
      });
      setMembers([]);
      fetchDashboardData(); // Refresh stats
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to record transaction';
      Alert.alert('Error', message);
    } finally {
      setRecording(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount: number) => `R ${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA');

  // Role-based permissions
  const userRole = auth.user?.role || 'MEMBER';
  const canRecordTransaction = ['TREASURER', 'ADMIN'].includes(userRole);
  const canManageMembers = ['TREASURER', 'CHAIRPERSON', 'ADMIN'].includes(userRole);
  const canViewAllTransactions = ['TREASURER', 'SECRETARY', 'CHAIRPERSON', 'ADMIN'].includes(userRole);
  const isAdmin = userRole === 'ADMIN';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <>
    <ScrollView 
      style={styles.screenContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
    >
      {/* Header with Gradient Effect */}
      <View style={styles.dashboardHeader}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{auth.user?.fullName?.split(' ')[0] || 'User'} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{userRole}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions - Role Based */}
      {canRecordTransaction && (
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => setShowRecordModal(true)}>
              <View style={[styles.quickActionIconBg, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.quickActionIcon}>💵</Text>
              </View>
              <Text style={styles.quickActionText}>Record{"\n"}Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn}>
              <View style={[styles.quickActionIconBg, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.quickActionIcon}>👥</Text>
              </View>
              <Text style={styles.quickActionText}>View{"\n"}Members</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn}>
              <View style={[styles.quickActionIconBg, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.quickActionIcon}>📊</Text>
              </View>
              <Text style={styles.quickActionText}>View{"\n"}Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionBtn}>
              <View style={[styles.quickActionIconBg, { backgroundColor: '#F3E5F5' }]}>
                <Text style={styles.quickActionIcon}>📢</Text>
              </View>
              <Text style={styles.quickActionText}>Send{"\n"}Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatsCard 
          title="My Stokvel Groups" 
          value={stats.totalGroups} 
          subtitle="Active memberships"
        />
        <StatsCard 
          title={canViewAllTransactions ? "Total Amount Collected" : "Total Contributions"} 
          value={formatCurrency(stats.totalContributions)} 
          subtitle="All time total"
          color="#1976D2"
        />
      </View>
      
      <View style={styles.statsRow}>
        <StatsCard 
          title="Pending Transactions" 
          value={stats.pendingPayouts} 
          subtitle="Awaiting approval"
          color="#F57C00"
        />
        <StatsCard 
          title="Account Type" 
          value={auth.user?.role || 'Member'} 
          subtitle="Your role"
          color="#7B1FA2"
        />
      </View>

      {/* Treasurer/Admin: Pending Approvals Alert */}
      {canRecordTransaction && stats.pendingPayouts > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{stats.pendingPayouts} Pending Transactions</Text>
            <Text style={styles.alertText}>Tap here to review and approve payments</Text>
          </View>
          <Text style={styles.alertArrow}>›</Text>
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {canViewAllTransactions ? 'Recent Group Transactions' : 'My Recent Transactions'}
        </Text>
        {stats.recentTransactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions recorded yet. Your payment history will appear here.</Text>
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

      {/* Record Transaction Modal */}
      <Modal visible={showRecordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record New Transaction</Text>
            
            {/* Transaction Type */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Transaction Type *</Text>
              <View style={styles.frequencyRow}>
                {['CONTRIBUTION', 'FINE_PAYMENT', 'LOAN_REPAYMENT'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeBtn,
                      newTransaction.transactionType === type && styles.typeBtnActive
                    ]}
                    onPress={() => setNewTransaction({ ...newTransaction, transactionType: type })}
                  >
                    <Text style={[
                      styles.typeBtnText,
                      newTransaction.transactionType === type && styles.typeBtnTextActive
                    ]}>
                      {type === 'CONTRIBUTION' ? '💵 Contribution' : type === 'FINE_PAYMENT' ? '⚠️ Fine Payment' : '🔄 Loan Repayment'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Select Group */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Stokvel Group *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionRow}>
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[
                      styles.selectionChip,
                      newTransaction.stokvelGroupId === group.id && styles.selectionChipActive
                    ]}
                    onPress={() => {
                      setNewTransaction({ ...newTransaction, stokvelGroupId: group.id, memberId: '' });
                      fetchGroupMembers(group.id);
                    }}
                  >
                    <Text style={[
                      styles.selectionChipText,
                      newTransaction.stokvelGroupId === group.id && styles.selectionChipTextActive
                    ]}>
                      {group.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {groups.length === 0 && <Text style={styles.emptyText}>No groups available. Please create a group first.</Text>}
            </View>

            {/* Select Member */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Group Member *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectionRow}>
                {members.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.selectionChip,
                      newTransaction.memberId === member.id && styles.selectionChipActive
                    ]}
                    onPress={() => setNewTransaction({ ...newTransaction, memberId: member.id })}
                  >
                    <Text style={[
                      styles.selectionChipText,
                      newTransaction.memberId === member.id && styles.selectionChipTextActive
                    ]}>
                      {member.user.fullName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {newTransaction.stokvelGroupId && members.length === 0 && (
                <Text style={styles.emptyText}>No members found in this group</Text>
              )}
              {!newTransaction.stokvelGroupId && (
                <Text style={styles.emptyText}>Please select a group first</Text>
              )}
            </View>

            {/* Amount */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Transaction Amount (Rands) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount in Rands (e.g., 500.00)"
                value={newTransaction.amount}
                onChangeText={(text) => setNewTransaction({ ...newTransaction, amount: text })}
                keyboardType="numeric"
              />
            </View>

            {/* Payment Method */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.frequencyRow}>
                {['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.typeBtn,
                      newTransaction.paymentMethod === method && styles.typeBtnActive
                    ]}
                    onPress={() => setNewTransaction({ ...newTransaction, paymentMethod: method })}
                  >
                    <Text style={[
                      styles.typeBtnText,
                      newTransaction.paymentMethod === method && styles.typeBtnTextActive
                    ]}>
                      {method === 'CASH' ? '💵 Cash' : method === 'BANK_TRANSFER' ? '🏦 Bank Transfer' : '📱 Mobile Money'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Additional Notes (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter any additional notes or comments..."
                value={newTransaction.notes}
                onChangeText={(text) => setNewTransaction({ ...newTransaction, notes: text })}
              />
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => {
                  setShowRecordModal(false);
                  setNewTransaction({
                    stokvelGroupId: '',
                    memberId: '',
                    transactionType: 'CONTRIBUTION',
                    amount: '',
                    paymentMethod: 'CASH',
                    notes: '',
                  });
                  setMembers([]);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, recording && styles.buttonDisabled]} 
                onPress={handleRecordTransaction}
                disabled={recording}
              >
                {recording ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Record Transaction</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ============ GROUPS SCREEN ============
interface GroupMember {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; fullName: string; phoneNumber: string; email?: string };
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
  lastContributionDate: string | null;
  lastContributionAmount: number | null;
  daysSincePayment: number | null;
}

const GroupsScreen = ({ auth }: { auth: AuthState }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
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

  const fetchGroupMembers = async (groupId: string) => {
    setLoadingMembers(true);
    try {
      const headers = { Authorization: `Bearer ${auth.token}` };
      const response = await axios.get(`${API_URL}/groups/${groupId}/members`, { headers });
      setGroupMembers(response.data.data || []);
    } catch (error) {
      console.error('Members fetch error:', error);
      setGroupMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleGroupExpanded = (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setGroupMembers([]);
    } else {
      setExpandedGroupId(groupId);
      fetchGroupMembers(groupId);
    }
  };

  const getPaymentStatusIcon = (status: 'PAID' | 'PENDING' | 'OVERDUE') => {
    switch (status) {
      case 'PAID': return '🟢';
      case 'PENDING': return '🟡';
      case 'OVERDUE': return '🔴';
    }
  };

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

  // Role-based permissions
  const userRole = auth.user?.role || 'MEMBER';
  const canCreateGroup = ['TREASURER', 'CHAIRPERSON', 'ADMIN'].includes(userRole);

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
        {canCreateGroup && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
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
            <Text style={styles.emptyText}>
              {canCreateGroup 
                ? 'Create a new stokvel group to get started' 
                : 'Ask your treasurer to invite you to a group'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View>
            <TouchableOpacity 
              style={styles.groupCard}
              onPress={() => toggleGroupExpanded(item.id)}
            >
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.groupFrequency}>{item.contributionFrequency}</Text>
                  <Text style={{ marginLeft: 8, fontSize: 12 }}>
                    {expandedGroupId === item.id ? '▲' : '▼'}
                  </Text>
                </View>
              </View>
              {item.description && (
                <Text style={styles.groupDescription} numberOfLines={2}>{item.description}</Text>
              )}
              <View style={styles.groupFooter}>
                <Text style={styles.groupAmount}>
                  Contribution: {formatCurrency(item.contributionAmount)}
                </Text>
                <Text style={styles.groupMembers}>
                  {item._count?.members || item.memberCount || 1} member(s)
                </Text>
              </View>
            </TouchableOpacity>

            {/* Expanded Member List */}
            {expandedGroupId === item.id && (
              <View style={styles.memberListContainer}>
                <Text style={styles.memberListTitle}>👥 Members</Text>
                {loadingMembers ? (
                  <ActivityIndicator size="small" color="#2E7D32" style={{ padding: 16 }} />
                ) : groupMembers.length === 0 ? (
                  <Text style={styles.emptyText}>No members found</Text>
                ) : (
                  groupMembers.map((member) => (
                    <View key={member.id} style={styles.memberRow}>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberStatusIcon}>
                          {getPaymentStatusIcon(member.paymentStatus)}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>{member.user.fullName}</Text>
                          <Text style={styles.memberRole}>{member.role}</Text>
                        </View>
                      </View>
                      <View style={styles.memberPaymentInfo}>
                        <Text style={[
                          styles.paymentStatusText,
                          member.paymentStatus === 'PAID' && { color: '#2E7D32' },
                          member.paymentStatus === 'PENDING' && { color: '#F57C00' },
                          member.paymentStatus === 'OVERDUE' && { color: '#D32F2F' },
                        ]}>
                          {member.paymentStatus}
                        </Text>
                        {member.lastContributionDate && (
                          <Text style={styles.lastPaymentText}>
                            Last: {new Date(member.lastContributionDate).toLocaleDateString('en-ZA')}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
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
  const [totalContributed, setTotalContributed] = useState(0);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const headers = { Authorization: `Bearer ${auth.token}` };
        const [groupsRes, transactionsRes] = await Promise.all([
          axios.get(`${API_URL}/groups`, { headers }),
          axios.get(`${API_URL}/transactions`, { headers })
        ]);
        setMembershipCount((groupsRes.data.data || []).length);
        // API returns data.data.transactions, not data.data
        const transactions = transactionsRes.data?.data?.transactions || [];
        const contributions = transactions
          .filter((t: any) => t.transactionType === 'CONTRIBUTION' && t.status === 'COMPLETED')
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        setTotalContributed(contributions);
      } catch (error) {
        console.error('Profile data fetch error:', error);
      }
    };
    fetchProfileData();
  }, [auth.token]);

  const formatPhone = (phone: string) => {
    if (phone?.startsWith('27')) {
      return `0${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    }
    return phone;
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: '#9C27B0',
      TREASURER: '#2E7D32',
      CHAIRPERSON: '#1976D2',
      SECRETARY: '#F57C00',
      MEMBER: '#607D8B',
    };
    return colors[role] || '#607D8B';
  };

  return (
    <ScrollView style={styles.screenContainer} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeaderCard}>
        <View style={[styles.profileAvatar, { backgroundColor: getRoleColor(auth.user?.role || 'MEMBER') }]}>
          <Text style={styles.profileAvatarText}>{getInitials(auth.user?.fullName || '')}</Text>
        </View>
        <Text style={styles.profileFullName}>{auth.user?.fullName}</Text>
        <View style={[styles.profileRoleBadge, { backgroundColor: getRoleColor(auth.user?.role || 'MEMBER') }]}>
          <Text style={styles.profileRoleBadgeText}>{auth.user?.role}</Text>
        </View>
        
        {/* Stats Row */}
        <View style={styles.profileStatsRow}>
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>{membershipCount}</Text>
            <Text style={styles.profileStatLabel}>Stokvel Groups</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>R{totalContributed.toFixed(0)}</Text>
            <Text style={styles.profileStatLabel}>Total Contributed</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>✓</Text>
            <Text style={styles.profileStatLabel}>ID Verified</Text>
          </View>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionHeader}>📱 Contact Information</Text>
        
        <View style={styles.profileInfoRow}>
          <View style={styles.profileInfoIcon}>
            <Text>📞</Text>
          </View>
          <View style={styles.profileInfoContent}>
            <Text style={styles.profileInfoLabel}>Mobile Phone Number</Text>
            <Text style={styles.profileInfoValue}>{formatPhone(auth.user?.phoneNumber || '')}</Text>
          </View>
        </View>
        
        <View style={styles.profileInfoRow}>
          <View style={styles.profileInfoIcon}>
            <Text>✉️</Text>
          </View>
          <View style={styles.profileInfoContent}>
            <Text style={styles.profileInfoLabel}>Email Address</Text>
            <Text style={styles.profileInfoValue}>{auth.user?.email || 'No email address provided'}</Text>
          </View>
        </View>
      </View>

      {/* Account Details */}
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionHeader}>🔐 Account Information</Text>
        
        <View style={styles.profileInfoRow}>
          <View style={styles.profileInfoIcon}>
            <Text>🆔</Text>
          </View>
          <View style={styles.profileInfoContent}>
            <Text style={styles.profileInfoLabel}>Unique User Identifier</Text>
            <Text style={styles.profileInfoValue}>{auth.user?.id?.slice(0, 12)}...</Text>
          </View>
        </View>
        
        <View style={styles.profileInfoRow}>
          <View style={styles.profileInfoIcon}>
            <Text>👤</Text>
          </View>
          <View style={styles.profileInfoContent}>
            <Text style={styles.profileInfoLabel}>Account Type</Text>
            <Text style={styles.profileInfoValue}>{auth.user?.role}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.profileSection}>
        <Text style={styles.profileSectionHeader}>⚙️ Settings & Preferences</Text>
        
        <TouchableOpacity style={styles.profileActionRow}>
          <View style={styles.profileActionLeft}>
            <Text style={styles.profileActionIcon}>🔔</Text>
            <Text style={styles.profileActionText}>Notification Settings</Text>
          </View>
          <Text style={styles.profileActionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileActionRow}>
          <View style={styles.profileActionLeft}>
            <Text style={styles.profileActionIcon}>🔒</Text>
            <Text style={styles.profileActionText}>Change Your Password</Text>
          </View>
          <Text style={styles.profileActionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileActionRow}>
          <View style={styles.profileActionLeft}>
            <Text style={styles.profileActionIcon}>❓</Text>
            <Text style={styles.profileActionText}>Help & Customer Support</Text>
          </View>
          <Text style={styles.profileActionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileActionRow}>
          <View style={styles.profileActionLeft}>
            <Text style={styles.profileActionIcon}>📄</Text>
            <Text style={styles.profileActionText}>Terms and Conditions</Text>
          </View>
          <Text style={styles.profileActionArrow}>›</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.profileActionRow}>
          <View style={styles.profileActionLeft}>
            <Text style={styles.profileActionIcon}>🔏</Text>
            <Text style={styles.profileActionText}>Privacy Policy</Text>
          </View>
          <Text style={styles.profileActionArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButtonLarge} onPress={onLogout}>
        <Text style={styles.logoutButtonIcon}>🚪</Text>
        <Text style={styles.logoutButtonLargeText}>Sign Out of Your Account</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>eStokvel Version 1.0.0 • Proudly Made in South Africa 🇿🇦</Text>
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
    backgroundColor: '#f5f7fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  
  // ============ AUTH SCREENS (Login/Register) ============
  authScrollContent: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f5f7fa',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 36,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: 1,
  },
  logoTagline: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  authCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  authCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  authCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  authInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    color: '#333',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 16,
  },
  passwordToggleText: {
    fontSize: 20,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  authFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
  },
  authFooterText: {
    color: '#666',
    fontSize: 14,
  },
  authFooterLink: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Register Screen Specific
  registerHeader: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  registerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stepHeader: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  
  // Legacy styles kept for compatibility
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
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  buttonTextSecondary: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  link: {
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  
  // Validation Styles
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  validationText: {
    fontSize: 12,
    marginTop: 4,
  },
  validationSuccess: {
    color: '#4caf50',
  },
  validationError: {
    color: '#f44336',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  // Password Strength
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  passwordStrengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Progress Bar
  progressContainer: {
    height: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 2,
    marginBottom: 24,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 2,
  },
  
  // Section Subtitle (for registration form)
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  
  // Multiline Input
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
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

  // Header (Legacy - kept for compatibility)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },

  // Role Badge
  roleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2E7D32',
  },

  // Dashboard Header
  dashboardHeader: {
    backgroundColor: '#2E7D32',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },

  // Quick Actions Card
  quickActionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickActionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionIcon: {
    fontSize: 22,
  },
  quickActionText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Legacy Quick Actions
  quickActions: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },

  // Alert Card (Pending approvals)
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
  },
  alertText: {
    fontSize: 12,
    color: '#F57C00',
    marginTop: 2,
  },
  alertArrow: {
    fontSize: 24,
    color: '#F57C00',
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

  // Member List (Expandable)
  memberListContainer: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  memberListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberStatusIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberRole: {
    fontSize: 12,
    color: '#888',
  },
  memberPaymentInfo: {
    alignItems: 'flex-end',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastPaymentText: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
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

  // Selection Chips for Record Transaction
  selectionRow: {
    maxHeight: 50,
  },
  selectionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectionChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  selectionChipText: {
    color: '#666',
    fontWeight: '600',
  },
  selectionChipTextActive: {
    color: '#fff',
  },
  typeBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginRight: 8,
  },
  typeBtnActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  typeBtnText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeBtnTextActive: {
    color: '#fff',
  },

  // Profile - New Design
  profileHeaderCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  profileAvatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  profileFullName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  profileRoleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  profileRoleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D32',
  },
  profileStatLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  profileStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  profileSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileSectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfoContent: {
    flex: 1,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: '#888',
  },
  profileInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileActionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  profileActionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  profileActionArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  logoutButtonLarge: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutButtonLargeText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Legacy Profile Styles (kept for compatibility)
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
    color: '#aaa',
    marginVertical: 24,
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
  // Role Selection Styles
  roleSelectionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: '#2E7D32',
  },
  roleDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
});
