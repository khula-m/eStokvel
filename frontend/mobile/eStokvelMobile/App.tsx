import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import 'react-native-get-random-values';
import { showAlert } from './src/utils/alert';
import { GlobalOverlay } from './src/components/GlobalOverlay';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ChangePinScreen } from './src/screens/ChangePinScreen';
import { ForgotPinScreen } from './src/screens/ForgotPinScreen';
import { AdminRegisterScreen } from './src/screens/AdminRegisterScreen';
import { IdVerificationScreen } from './src/screens/IdVerificationScreen';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { registerForPushNotifications, dismissAllNotifications } from './src/utils/notifications';
import { API_URL } from './src/constants/config';
import { AuthState } from './src/types';

// Keep splash screen visible until we finish loading
SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress common non-critical warnings in production
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
  ]);
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null });
  const [isReady, setIsReady] = useState(false);
  const appState = useRef(AppState.currentState);
  const pushTokenRef = useRef<string | null>(null);
  const notifTabRef = useRef<string | null>(null);

  // Initialization: push notifications + splash screen
  useEffect(() => {
    async function init() {
      try {
        const pushToken = await registerForPushNotifications();
        if (pushToken) {
          pushTokenRef.current = pushToken;
        }
      } catch (e) {
        console.warn('Init error:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    init();
  }, []);

  // Navigate to the right tab when user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      const screen = data?.screen;
      if (screen === 'notifications') {
        notifTabRef.current = 'notifications';
      } else if (screen === 'dashboard') {
        notifTabRef.current = 'dashboard';
      }
    });
    return () => sub.remove();
  }, []);

  // Force re-login when app comes back from background; clear badge
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        dismissAllNotifications().catch(() => {});
      }
      if (appState.current.match(/active/) && nextState === 'background') {
        setAuth({ user: null, token: null });
        setCurrentScreen('landing');
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const navigate = (screen: string) => {
    if (screen === 'login' || screen === 'landing') setAuth({ user: null, token: null });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentScreen(screen);
  };

  const handleLogin = (data: any) => {
    setAuth({ user: data.user, token: data.token });
    if (pushTokenRef.current && data.token) {
      axios.post(`${API_URL}/api/notifications/push-token`, { pushToken: pushTokenRef.current }, {
        headers: { Authorization: `Bearer ${data.token}` }
      }).catch(() => {});
    }
  };

  // Re-fetch /auth/me and update the in-memory user (effectiveRole, memberships, etc.)
  // Call this after any action that changes group membership (create group, join group).
  const handleAuthRefresh = async () => {
    if (!auth.token) return;
    try {
      const res = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.data?.success && res.data?.data?.user) {
        setAuth(prev => ({ ...prev, user: { ...prev.user, ...res.data.data.user } }));
      }
    } catch {
      // Non-fatal — auth state will refresh on next login
    }
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); navigate('landing'); } },
    ]);
  };

  // Determine StatusBar style based on current screen
  // All screens now use gradient headers → light (white) status bar text
  const useLightStatus = currentScreen === 'landing' || currentScreen === 'main';

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar
        style={useLightStatus ? 'light' : 'dark'}
        backgroundColor={Platform.OS === 'android' ? (currentScreen === 'landing' ? '#0A2463' : currentScreen === 'main' ? '#0A2463' : '#FFFFFF') : undefined}
        translucent={Platform.OS === 'android'}
      />
      {currentScreen === 'landing' && <LandingScreen onGetStarted={() => navigate('login')} />}
      {currentScreen === 'login' && <LoginScreen onNavigate={navigate} onLogin={handleLogin} />}
      {currentScreen === 'change-pin' && <ChangePinScreen auth={auth} onNavigate={navigate} />}
      {currentScreen === 'forgot-pin' && <ForgotPinScreen onNavigate={navigate} />}
      {currentScreen === 'admin-register' && <AdminRegisterScreen onNavigate={navigate} />}
      {currentScreen === 'id-verification' && auth.token && <IdVerificationScreen auth={auth} onNavigate={navigate} />}
      {currentScreen === 'main' && <MainTabNavigator auth={auth} onLogout={handleLogout} onNavigate={navigate} onAuthRefresh={handleAuthRefresh} initialTab={notifTabRef.current || 'dashboard'} />}
      <GlobalOverlay />
    </SafeAreaProvider>
  );
}
