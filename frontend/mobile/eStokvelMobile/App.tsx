import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-get-random-values';
import { showAlert } from './src/utils/alert';
import { LoginScreen } from './src/screens/LoginScreen';
import { ChangePinScreen } from './src/screens/ChangePinScreen';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { AuthState } from './src/types';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [auth, setAuth] = useState<AuthState>({ user: null, token: null });

  const navigate = (screen: string) => {
    if (screen === 'login') setAuth({ user: null, token: null });
    setCurrentScreen(screen);
  };

  const handleLogin = (data: any) => { setAuth({ user: data.user, token: data.token }); };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => navigate('login') },
    ]);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {currentScreen === 'login' && <LoginScreen onNavigate={navigate} onLogin={handleLogin} />}
      {currentScreen === 'change-pin' && <ChangePinScreen auth={auth} onNavigate={navigate} />}
      {currentScreen === 'main' && <MainTabNavigator auth={auth} onLogout={handleLogout} onNavigate={navigate} />}
    </SafeAreaProvider>
  );
}
