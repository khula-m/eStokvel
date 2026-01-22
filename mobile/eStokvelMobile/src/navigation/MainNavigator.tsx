import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import HomeScreen from '../screens/main/HomeScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Placeholder screens
const GroupsScreen = () => (
  <Text style={styles.placeholder}>Groups Screen - Coming Soon</Text>
);

const TransactionsScreen = () => (
  <Text style={styles.placeholder}>Transactions Screen - Coming Soon</Text>
);

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let icon = '';
          
          switch (route.name) {
            case 'Home':
              icon = focused ? '🏠' : '🏡';
              break;
            case 'Groups':
              icon = focused ? '👥' : '👤';
              break;
            case 'Transactions':
              icon = focused ? '💰' : '💵';
              break;
            case 'Profile':
              icon = focused ? '⚙️' : '⚙️';
              break;
          }
          
          return <Text style={{ fontSize: 24 }}>{icon}</Text>;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{ title: 'My Groups' }}
      />
      <Tab.Screen 
        name="Transactions" 
        component={TransactionsScreen}
        options={{ title: 'Activity' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
});

export default MainNavigator;
