import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LedgerScreen } from '../screens/LedgerScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { BottomTabBar } from '../components/BottomTabBar';
import { GuidedTour, hasTourCompleted, ADMIN_TOUR_STEPS, MEMBER_TOUR_STEPS } from '../components/GuidedTour';
import { styles } from '../styles';
import { AuthState } from '../types';

interface MainTabNavigatorProps {
  auth: AuthState;
  onLogout: () => void;
  onNavigate: (screen: string) => void;
  onAuthRefresh: () => Promise<void>;
}

export const MainTabNavigator = ({ auth, onLogout, onNavigate, onAuthRefresh }: MainTabNavigatorProps) => {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [chatGroupId, setChatGroupId] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);

  const userRole = auth.user?.role === 'SUPERADMIN' ? 'ADMIN' : (auth.user?.effectiveRole || auth.user?.role || 'MEMBER');
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  const tourKey = isAdmin ? 'admin' : 'member';
  const tourSteps = isAdmin ? ADMIN_TOUR_STEPS : MEMBER_TOUR_STEPS;

  useEffect(() => {
    const checkTour = async () => {
      const completed = await hasTourCompleted(tourKey);
      if (!completed) setShowTour(true);
    };
    checkTour();
  }, [tourKey]);

  const navigateTab = (tab: string, groupId?: string) => {
    if (groupId) setChatGroupId(groupId);
    setCurrentTab(tab);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContent}>
        {currentTab === 'dashboard' && <DashboardScreen auth={auth} onLogout={onLogout} onNavigateTab={navigateTab} onAuthRefresh={onAuthRefresh} />}
        {currentTab === 'ledger' && <LedgerScreen auth={auth} />}
        {currentTab === 'chat' && <ChatScreen auth={auth} initialGroupId={chatGroupId} />}
        {currentTab === 'notifications' && <NotificationsScreen auth={auth} />}
        {currentTab === 'profile' && <ProfileScreen auth={auth} onLogout={onLogout} onNavigate={onNavigate} />}
      </View>
      <BottomTabBar currentTab={currentTab} onTabChange={setCurrentTab} userRole={auth.user?.role || 'MEMBER'} />
      <GuidedTour
        steps={tourSteps}
        tourKey={tourKey}
        visible={showTour}
        onComplete={() => setShowTour(false)}
      />
    </SafeAreaView>
  );
};
