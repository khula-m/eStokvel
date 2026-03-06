import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-get-random-values';
import { showAlert } from './src/utils/alert';
import { GlobalOverlay } from './src/components/GlobalOverlay';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ChangePinScreen } from './src/screens/ChangePinScreen';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { registerForPushNotifications } from './src/utils/notifications';
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

  // Initialization: push notifications + splash screen
  useEffect(() => {
    async function init() {
      try {
        // Register for push notifications on physical devices
        const pushToken = await registerForPushNotifications();
        if (pushToken) {
          console.log('Push token:', pushToken);
          // TODO: Send token to backend for storage
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

  // Force re-login when app comes back from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextState === 'background') {
        // App going to background — clear session so next open requires login
        setAuth({ user: null, token: null });
        setCurrentScreen('landing');
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const navigate = (screen: string) => {
    if (screen === 'login' || screen === 'landing') setAuth({ user: null, token: null });
    setCurrentScreen(screen);
  };

  const handleLogin = (data: any) => { setAuth({ user: data.user, token: data.token }); };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => navigate('landing') },
    ]);
  };

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar
        style={currentScreen === 'landing' ? 'light' : 'dark'}
        backgroundColor={Platform.OS === 'android' ? (currentScreen === 'landing' ? '#0A2463' : '#FFFFFF') : undefined}
        translucent={Platform.OS === 'android'}
      />
      {currentScreen === 'landing' && <LandingScreen onGetStarted={() => navigate('login')} />}
      {currentScreen === 'login' && <LoginScreen onNavigate={navigate} onLogin={handleLogin} />}
      {currentScreen === 'change-pin' && <ChangePinScreen auth={auth} onNavigate={navigate} />}
      {currentScreen === 'main' && <MainTabNavigator auth={auth} onLogout={handleLogout} onNavigate={navigate} />}
      <GlobalOverlay />
    </SafeAreaProvider>
  );
}
