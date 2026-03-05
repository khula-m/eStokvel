import React, { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-get-random-values';
import { showAlert } from './src/utils/alert';
import { GlobalOverlay } from './src/components/GlobalOverlay';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ChangePinScreen } from './src/screens/ChangePinScreen';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { AuthState } from './src/types';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null });
  const appState = useRef(AppState.currentState);

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

  return (
    <SafeAreaProvider>
      <StatusBar style={currentScreen === 'landing' ? 'light' : 'dark'} />
      {currentScreen === 'landing' && <LandingScreen onGetStarted={() => navigate('login')} />}
      {currentScreen === 'login' && <LoginScreen onNavigate={navigate} onLogin={handleLogin} />}
      {currentScreen === 'change-pin' && <ChangePinScreen auth={auth} onNavigate={navigate} />}
      {currentScreen === 'main' && <MainTabNavigator auth={auth} onLogout={handleLogout} onNavigate={navigate} />}
      <GlobalOverlay />
    </SafeAreaProvider>
  );
}
