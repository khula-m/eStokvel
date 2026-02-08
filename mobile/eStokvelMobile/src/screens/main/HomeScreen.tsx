import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { TreasurerDashboard } from '../../components/dashboards/TreasurerDashboard';
import { MemberDashboard } from '../../components/dashboards/MemberDashboard';
import GetStartedScreen from '../groups/GetStartedScreen';
import CreateGroupScreen from '../groups/CreateGroupScreen';
import JoinGroupScreen from '../groups/JoinGroupScreen';
import AddMemberScreen from '../groups/AddMemberScreen';
import RecordTransactionScreen from '../groups/RecordTransactionScreen';
import { TreasurerLedger } from '../../components/ledger/TreasurerLedger';
import { MemberLedger } from '../../components/ledger/MemberLedger';
import { colors } from '../../theme/colors';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

type ScreenType = 'dashboard' | 'getStarted' | 'createGroup' | 'joinGroup' | 'addMember' | 'recordTransaction' | 'ledger';

const HomeScreen: React.FC<{ onNavigate?: (screen: string) => void }> = ({ onNavigate }) => {
  const { user, token } = useAuthStore();
  const [groupId, setGroupId] = useState<string | undefined>();
  const [groupName, setGroupName] = useState('Loading...');
  const [groupCode, setGroupCode] = useState('ABC123');
  const [groupRole, setGroupRole] = useState<string | undefined>(); // User's role in the group
  const [loading, setLoading] = useState(true);
  const [hasGroup, setHasGroup] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');

  // Fetch user's primary group on mount
  useEffect(() => {
    const fetchUserGroup = async () => {
      try {
        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${API_URL}/api/groups`, { headers });
        const groups = response.data.data || [];
        
        if (groups.length > 0) {
          const primaryGroup = groups[0]; // Use first group as primary
          setGroupId(primaryGroup.id);
          setGroupName(primaryGroup.name || 'Your Group');
          setGroupCode(primaryGroup.code || primaryGroup.inviteCode || 'N/A');
          // Store the user's role in this group (CHAIRPERSON, TREASURER, MEMBER, etc.)
          setGroupRole(primaryGroup.userRole || primaryGroup.role);
          setHasGroup(true);
          setCurrentScreen('dashboard');
        } else {
          setHasGroup(false);
          setCurrentScreen('getStarted');
        }
      } catch (error) {
        console.error('Failed to fetch group:', error);
        setHasGroup(false);
        setCurrentScreen('getStarted');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchUserGroup();
    }
  }, [token]);

  const handleNavigation = (screen: string, params?: any) => {
    // Handle internal navigation for group flows
    switch (screen) {
      case 'createGroup':
        setCurrentScreen('createGroup');
        break;
      case 'joinGroup':
        setCurrentScreen('joinGroup');
        break;
      case 'getStarted':
        setCurrentScreen('getStarted');
        break;
      case 'addMember':
        if (!groupId) {
          Alert.alert('No Group', 'You need to create or join a group first');
          return;
        }
        setCurrentScreen('addMember');
        break;
      case 'recordTransaction':
        if (!groupId) {
          Alert.alert('No Group', 'You need to create or join a group first');
          return;
        }
        setCurrentScreen('recordTransaction');
        break;
      case 'ledger':
      case 'history':  // Member dashboard calls this 'history'
        if (!groupId) {
          Alert.alert('No Group', 'You need to create or join a group first');
          return;
        }
        setCurrentScreen('ledger');
        break;
      case 'makePayment':
        Alert.alert('Coming Soon', 'Online payment feature is coming soon! For now, please pay in person and your treasurer will record it.');
        break;
      case 'meetings':
        Alert.alert('Coming Soon', 'Meeting scheduling feature is coming soon!');
        break;
      case 'home':
        // Refresh groups and go to dashboard
        setCurrentScreen('dashboard');
        refreshGroups();
        break;
      case 'browseGroups':
        Alert.alert('Coming Soon', 'Browse public groups feature is coming soon!');
        break;
      default:
        if (onNavigate) {
          onNavigate(screen);
        } else {
          Alert.alert('Navigation', `Navigate to: ${screen}`);
        }
    }
  };

  const refreshGroups = () => {
    if (token) {
      axios.get(`${API_URL}/api/groups`, { headers: { Authorization: `Bearer ${token}` } })
        .then(response => {
          const groups = response.data.data || [];
          if (groups.length > 0) {
            const primaryGroup = groups[0];
            setGroupId(primaryGroup.id);
            setGroupName(primaryGroup.name || 'Your Group');
            setGroupCode(primaryGroup.code || primaryGroup.inviteCode || 'N/A');
            setGroupRole(primaryGroup.userRole || primaryGroup.role);
            setHasGroup(true);
          }
        })
        .catch(console.error);
    }
  };

  const handleBack = () => {
    if (hasGroup) {
      setCurrentScreen('dashboard');
    } else {
      setCurrentScreen('getStarted');
    }
  };

  // Determine which dashboard to show based on user's role in the group
  // CHAIRPERSON, TREASURER, SECRETARY, ADMIN can see treasurer dashboard
  const isTreasurer = groupRole === 'CHAIRPERSON' || groupRole === 'TREASURER' || 
                      groupRole === 'SECRETARY' || groupRole === 'ADMIN' ||
                      user?.role === 'TREASURER' || user?.role === 'ADMIN';

  // Show appropriate screen based on current state
  if (currentScreen === 'createGroup') {
    return <CreateGroupScreen onNavigate={handleNavigation} onBack={handleBack} />;
  }

  if (currentScreen === 'joinGroup') {
    return <JoinGroupScreen onNavigate={handleNavigation} onBack={handleBack} />;
  }

  if (currentScreen === 'addMember') {
    return (
      <AddMemberScreen
        token={token || ''}
        groupId={groupId || ''}
        groupName={groupName}
        groupCode={groupCode}
        onBack={handleBack}
      />
    );
  }

  if (currentScreen === 'recordTransaction') {
    return (
      <RecordTransactionScreen
        token={token || ''}
        groupId={groupId || ''}
        groupName={groupName}
        onBack={handleBack}
        onSuccess={refreshGroups}
      />
    );
  }

  if (currentScreen === 'ledger') {
    return isTreasurer ? (
      <TreasurerLedger
        token={token || ''}
        groupId={groupId || ''}
        groupName={groupName}
        onBack={handleBack}
      />
    ) : (
      <MemberLedger
        token={token || ''}
        groupId={groupId || ''}
        groupName={groupName}
        onBack={handleBack}
      />
    );
  }

  if (currentScreen === 'getStarted' || (!loading && !hasGroup)) {
    return <GetStartedScreen onNavigate={handleNavigation} />;
  }

  return (
    <View style={styles.container}>
      {isTreasurer ? (
        <TreasurerDashboard 
          user={user} 
          token={token || ''}
          groupId={groupId}
          groupName={groupName} 
          groupCode={groupCode}
          onNavigate={handleNavigation}
        />
      ) : (
        <MemberDashboard 
          user={user} 
          token={token || ''}
          groupId={groupId}
          groupName={groupName}
          onNavigate={handleNavigation}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default HomeScreen;

