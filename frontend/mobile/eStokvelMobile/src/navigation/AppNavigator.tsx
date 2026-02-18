import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ChatScreen from '../screens/chat/ChatScreen';
import {
  BankDetailsScreen,
  PaymentProofScreen,
  PaymentVerificationScreen,
} from '../screens/payments';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

// Main app stack with tabs and additional screens
const MainStackNavigator: React.FC = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen 
        name="Tabs" 
        component={MainNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={({ route }) => ({
          title: (route.params as any)?.groupName || 'Group Chat',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        })}
      />
      <MainStack.Screen 
        name="BankDetails" 
        component={BankDetailsScreen}
        options={{
          title: 'Bank Details',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <MainStack.Screen 
        name="PaymentProof" 
        component={PaymentProofScreen}
        options={{
          title: 'Upload Payment Proof',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <MainStack.Screen 
        name="PaymentVerification" 
        component={PaymentVerificationScreen}
        options={{
          title: 'Verify Payments',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </MainStack.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainStackNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
